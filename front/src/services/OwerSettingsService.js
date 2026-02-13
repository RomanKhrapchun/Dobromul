import API from "../http";
import { fetchTimeout } from "../utils/constants";

export default class OwerSettingsService {
    // Public endpoint - no auth required
    static async getPublicSettings() {
        return API.get('api/ower-settings/public', { timeout: fetchTimeout });
    }

    // Protected endpoint - requires auth
    static async getSettings() {
        return API.get('api/ower-settings', { timeout: fetchTimeout });
    }

    // Update settings - requires admin
    static async updateSettings(settings) {
        return API.put('api/ower-settings', settings, { timeout: fetchTimeout });
    }

    // Invalidate cache - requires admin
    static async invalidateCache() {
        return API.post('api/ower-settings/invalidate-cache', null, { timeout: fetchTimeout });
    }
}
