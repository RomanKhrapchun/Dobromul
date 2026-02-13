import API from "../http";
import { fetchTimeout } from "../utils/constants";

export default class CommunitySettingsService {
    // Public endpoint - no auth required
    static async getPublicSettings() {
        return API.get('api/community-settings/public', { timeout: fetchTimeout });
    }

    // Protected endpoint - requires auth
    static async getSettings() {
        return API.get('api/community-settings', { timeout: fetchTimeout });
    }

    // Update settings - requires admin
    static async updateSettings(settings) {
        return API.put('api/community-settings', settings, { timeout: fetchTimeout });
    }

    // Create settings - requires admin
    static async createSettings(settings) {
        return API.post('api/community-settings', settings, { timeout: fetchTimeout });
    }

    // Invalidate cache - requires admin
    static async invalidateCache() {
        return API.post('api/community-settings/invalidate-cache', null, { timeout: fetchTimeout });
    }
}
