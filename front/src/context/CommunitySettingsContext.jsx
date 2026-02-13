import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import CommunitySettingsService from '../services/CommunitySettingsService';

const CommunitySettingsContext = createContext(null);

// Default values (fallback if API fails)
const defaultSettings = {
    cityName: '',
    cityCouncil: '',
    altCityName: '',
    territoryTitle: '',
    territoryTitleInstrumental: '',
    websiteName: '',
    websiteUrl: '',
    websiteUrlP4v: '',
    telegramName: '',
    telegramUrl: '',
    phoneNumberGuDps: '',
    phoneNumberKindergarten: '',
    currentRegion: {
        name: '',
        genitive: '',
        dative: '',
        accusative: '',
        instrumental: '',
        locative: ''
    },
    guDpsRegion: '',
    guDpsAddress: '',
    debtChargeAccount: '',
    communityName: '',
    altQrCode: ''
};

export function CommunitySettingsProvider({ children }) {
    const [settings, setSettings] = useState(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSettings = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await CommunitySettingsService.getPublicSettings();
            if (response.data && !response.data.error) {
                //console.log('[CommunitySettings] Settings updated:', response.data.data);
                setSettings(response.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch community settings:', err);
            setError(err.message || 'Failed to load settings');
            // Keep default settings on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();

        // Refresh settings when window regains focus (user returns to tab)
        const handleFocus = () => {
            fetchSettings();
        };

        // Listen for updates from other tabs/windows
        const handleStorageChange = (e) => {
            if (e.key === 'community-settings-updated') {
                fetchSettings();
            }
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('storage', handleStorageChange);

        // Optional: Also refresh periodically (every 5 minutes)
        const intervalId = setInterval(() => {
            fetchSettings();
        }, 5 * 60 * 1000); // 5 minutes

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(intervalId);
        };
    }, [fetchSettings]);

    const updateSettings = useCallback(async (newSettings) => {
        try {
            setIsLoading(true);
            const response = await CommunitySettingsService.updateSettings(newSettings);
            if (response.data && !response.data.error) {
                // Invalidate cache on backend
                await CommunitySettingsService.invalidateCache();

                // Update local state immediately
                setSettings(response.data.data);

                // Broadcast update to other tabs/windows
                window.localStorage.setItem('community-settings-updated', Date.now().toString());

                return { success: true, data: response.data.data };
            }
            return { success: false, error: response.data?.message || 'Update failed' };
        } catch (err) {
            console.error('Failed to update community settings:', err);
            return { success: false, error: err.message || 'Update failed' };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refreshSettings = useCallback(async () => {
        await fetchSettings();
    }, [fetchSettings]);

    const value = {
        settings,
        isLoading,
        error,
        updateSettings,
        refreshSettings
    };

    return (
        <CommunitySettingsContext.Provider value={value}>
            {children}
        </CommunitySettingsContext.Provider>
    );
}

export function useCommunitySettings() {
    const context = useContext(CommunitySettingsContext);
    if (!context) {
        throw new Error('useCommunitySettings must be used within a CommunitySettingsProvider');
    }
    return context;
}

// Convenience hook for accessing individual settings
export function useCommunityValue(key) {
    const { settings } = useCommunitySettings();
    return settings[key];
}

export default CommunitySettingsContext;
