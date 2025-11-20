import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ErrorReportPayload {
  id: string;
  orderNumber: string;
  afoNumber: string;
  machine?: string;
  defectiveQuantity: number;
  totalDefectiveQuantity: number;
  quantityType?: string;
  detectionLocation?: string;
  problemDescription: string;
  errorCause: string;
  correctiveAction: string;
  creator: string;
  personalNumber?: string;
  assignedTeamLeader?: string;
  excelDepartment?: string;
  additionalInfo?: string;
  additionalExcelData?: Record<string, any>;
  resourceName?: string;
  audioFiles?: {
    problemDescription?: string;
    errorCause?: string;
    correctiveAction?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const payload: ErrorReportPayload = await req.json();

    console.log('Creating error report:', { id: payload.id, orderNumber: payload.orderNumber });

    // Validate required fields
    if (!payload.id || !payload.orderNumber || !payload.afoNumber) {
      throw new Error('Missing required fields: id, orderNumber, or afoNumber');
    }

    if (!payload.problemDescription || payload.problemDescription.trim().length < 10) {
      throw new Error('Problem description must be at least 10 characters long');
    }

    if (!payload.errorCause || payload.errorCause.trim().length === 0) {
      throw new Error('Error cause is required');
    }

    if (!payload.correctiveAction || payload.correctiveAction.trim().length === 0) {
      throw new Error('Corrective action is required');
    }

    if (!payload.defectiveQuantity || payload.defectiveQuantity <= 0) {
      throw new Error('Defective quantity must be greater than 0');
    }

    if (!payload.creator || payload.creator.trim().length < 2) {
      throw new Error('Creator name must be at least 2 characters long');
    }

    // Get or create a system user for anonymous reports
    const { data: systemUser, error: systemUserError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('name', 'System')
      .single();

    let creatorId: string;

    if (systemUserError || !systemUser) {
      // Create system user if it doesn't exist
      const { data: newSystemUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: 'system@internal.local',
        password: Math.random().toString(36).slice(-16),
        email_confirm: true,
        user_metadata: { name: 'System' }
      });

      if (createError) {
        console.error('Error creating system user:', createError);
        throw new Error('Failed to create system user');
      }

      creatorId = newSystemUser.user.id;

      // Create profile for system user
      await supabaseClient
        .from('profiles')
        .insert({
          id: creatorId,
          name: 'System'
        });
    } else {
      creatorId = systemUser.id;
    }

    // Prepare the report data
    const reportData = {
      id: payload.id,
      order_number: payload.orderNumber,
      afo_number: payload.afoNumber,
      machine_id: payload.machine || null,
      defective_quantity: payload.defectiveQuantity,
      total_defective_quantity: payload.totalDefectiveQuantity,
      quantity_type: payload.quantityType || null,
      detection_location: payload.detectionLocation || null,
      problem_description: payload.problemDescription,
      error_cause: payload.errorCause,
      corrective_action: payload.correctiveAction,
      creator_id: creatorId,
      creator_name: payload.creator,
      personal_number: payload.personalNumber || null,
      approval_status: 'pending',
      assigned_team_leader_id: (payload.assignedTeamLeader && payload.assignedTeamLeader !== 'System') 
        ? payload.assignedTeamLeader 
        : null,
      department_id: payload.excelDepartment || null,
      additional_info: payload.additionalInfo || null,
      additional_excel_data: payload.additionalExcelData || null,
      resource_name: payload.resourceName || null,
    };

    // Insert the error report
    const { data: report, error: reportError } = await supabaseClient
      .from('error_reports')
      .insert(reportData)
      .select()
      .single();

    if (reportError) {
      console.error('Error inserting report:', reportError);
      throw new Error(`Failed to create error report: ${reportError.message}`);
    }

    console.log('Report created successfully:', report.id);

    // Handle audio files if provided
    if (payload.audioFiles) {
      const audioInserts = [];
      
      if (payload.audioFiles.problemDescription) {
        audioInserts.push({
          report_id: report.id,
          field_name: 'problemDescription',
          storage_path: payload.audioFiles.problemDescription
        });
      }
      
      if (payload.audioFiles.errorCause) {
        audioInserts.push({
          report_id: report.id,
          field_name: 'errorCause',
          storage_path: payload.audioFiles.errorCause
        });
      }
      
      if (payload.audioFiles.correctiveAction) {
        audioInserts.push({
          report_id: report.id,
          field_name: 'correctiveAction',
          storage_path: payload.audioFiles.correctiveAction
        });
      }

      if (audioInserts.length > 0) {
        const { error: audioError } = await supabaseClient
          .from('audio_files')
          .insert(audioInserts);

        if (audioError) {
          console.error('Error inserting audio files:', audioError);
          // Don't fail the whole request if audio files fail
        } else {
          console.log(`${audioInserts.length} audio file(s) linked to report`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        report: report 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-error-report function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
