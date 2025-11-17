import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

interface PrivateRouteProps {
    children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const location = useLocation();

    // ✅ Log để debug
    useEffect(() => {
        console.log('🔍 PrivateRoute check:', {
            path: location.pathname,
            authenticated: isAuthenticated(),
            hasToken: !!localStorage.getItem('token')
        });
    }, [location]);

    if (!isAuthenticated()) {
        console.warn('⚠️ Not authenticated, redirecting to login');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    console.log('✅ Authenticated, rendering children');
    return children;
};

export default PrivateRoute;