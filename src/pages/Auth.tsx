import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to main page - login button is now in the header
    navigate('/');
  }, [navigate]);
  
  return null;
};

export default Auth;
