import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getFarms } from '../api/farmService';
import { isAuthenticated } from '../utils/auth';

interface FarmContextType {
    farmId: number | null;
    setFarmId: (id: number | null) => void;
    isLoadingFarm: boolean;
    resetFarmContext: () => void;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export const FarmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [farmId, setFarmId] = useState<number | null>(() => {
        if (!isAuthenticated()) return null;
        const saved = localStorage.getItem('selectedFarmId');
        return saved ? parseInt(saved, 10) : null;
    });
    const [isLoadingFarm, setIsLoadingFarm] = useState(true);

    const resetFarmContext = () => {
        setFarmId(null);
        localStorage.removeItem('selectedFarmId');
    };

    // ✅ THÊM: Listener để reset khi token bị xóa
    useEffect(() => {
        const checkAuth = () => {
            if (!isAuthenticated()) {
                console.log('🔄 Auth lost, resetting farm context');
                resetFarmContext();
                setIsLoadingFarm(false);
            }
        };

        // Kiểm tra mỗi khi window focus
        window.addEventListener('focus', checkAuth);

        // Kiểm tra khi localStorage thay đổi (từ tab khác)
        window.addEventListener('storage', checkAuth);

        return () => {
            window.removeEventListener('focus', checkAuth);
            window.removeEventListener('storage', checkAuth);
        };
    }, []);

    useEffect(() => {
        const autoSelectFarm = async () => {
            if (!isAuthenticated()) {
                console.log('⏸️ Not authenticated, skipping farm fetch');
                setIsLoadingFarm(false);
                setFarmId(null);
                return;
            }

            if (farmId === null) {
                try {
                    console.log('🔍 Auto-selecting first farm...');
                    const response = await getFarms();
                    const farmList = response.data.data || response.data;

                    if (Array.isArray(farmList) && farmList.length > 0) {
                        setFarmId(farmList[0].id);
                        console.log('✅ Auto-selected farm:', farmList[0].id);
                    } else {
                        console.warn('⚠️ No farms available');
                    }
                } catch (error) {
                    console.error('❌ Failed to auto-select farm:', error);
                } finally {
                    setIsLoadingFarm(false);
                }
            } else {
                console.log('✅ Using saved farmId:', farmId);
                setIsLoadingFarm(false);
            }
        };

        autoSelectFarm();
    }, []);

    useEffect(() => {
        if (farmId !== null) {
            localStorage.setItem('selectedFarmId', farmId.toString());
            console.log('💾 Saved farmId to localStorage:', farmId);
        } else {
            localStorage.removeItem('selectedFarmId');
        }
    }, [farmId]);

    return (
        <FarmContext.Provider value={{ farmId, setFarmId, isLoadingFarm, resetFarmContext }}>
            {children}
        </FarmContext.Provider>
    );
};

export const useFarm = () => {
    const context = useContext(FarmContext);
    if (!context) {
        throw new Error('useFarm must be used within FarmProvider');
    }
    return context;
};