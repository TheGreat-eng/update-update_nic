// src/main.tsx

// VVVV--- 1. IMPORT CÁC FILE CSS CỦA THƯ VIỆN LÊN TRÊN CÙNG ---VVVV
import 'antd/dist/reset.css';

// VVVV--- 2. IMPORT CÁC THƯ VIỆN REACT VÀ CÁC THƯ VIỆN KHÁC ---VVVV
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme as antdTheme, App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// VVVV--- 3. IMPORT CÁC COMPONENT VÀ CONTEXT CỦA BẠN ---VVVV
import App from './App.tsx';
import { FarmProvider } from './context/FarmContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// VVVV--- 4. CUỐI CÙNG, IMPORT FILE CSS TÙY CHỈNH CỦA BẠN ---VVVV
import './index.css';

// ====================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppWithTheme() {
  const { isDark } = useTheme();

  const lightTheme = {
    colorPrimary: '#667eea',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    colorTextBase: '#1f2937',
    colorBgLayout: '#f7f8fc',
    borderRadius: 8,
    fontFamily: "'Inter', sans-serif",
  };

  const darkTheme = {
    colorPrimary: '#667eea',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    colorTextBase: '#e5e7eb',
    colorBgLayout: '#141414',
    colorBgContainer: '#1d1d1d',
    colorBorder: '#303030',
    borderRadius: 8,
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: isDark ? darkTheme : lightTheme,
          components: {
            Card: {
              headerBg: 'transparent',
              paddingLG: 20,
            },
            Button: {
              primaryShadow: '0 2px 0 rgba(102, 126, 234, 0.1)',
            },
          },
        }}
      >
        <AntdApp>
          <QueryClientProvider client={queryClient}>
            <FarmProvider>
              <App />
            </FarmProvider>
          </QueryClientProvider>
        </AntdApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  </React.StrictMode>,
);