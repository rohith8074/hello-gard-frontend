import axios from 'axios';
import { getToken } from './auth';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Auth APIs
export const registerUser = async (username: string, name: string, password: string) => {
    const response = await api.post('/auth/register', { username, name, password });
    return response.data;
};

export const loginUser = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data; // { access_token, token_type, user }
};

export const getMe = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

// Admin APIs
export const adminListUsers = async () => {
    const response = await api.get('/admin/users');
    return response.data;
};

export const adminApproveUser = async (userId: string) => {
    const response = await api.patch(`/admin/users/${userId}/approve`);
    return response.data;
};

export const adminToggleRole = async (userId: string) => {
    const response = await api.patch(`/admin/users/${userId}/role`);
    return response.data;
};

export const adminToggleSuspend = async (userId: string) => {
    const response = await api.patch(`/admin/users/${userId}/suspend`);
    return response.data;
};

export const adminRejectUser = async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}/reject`);
    return response.data;
};

export const getInteractions = async () => {
    const response = await api.get('/interactions');
    return response.data;
};

export const getFleetStatus = async (product?: string) => {
    try {
        const params = product && product !== 'all' ? `?product=${product}` : '';
        const response = await api.get(`/fleet/robots${params}`);
        return response.data;
    } catch (error) {
        return { robots: [], summary: { total: 0, online: 0, errors: 0, offline: 0 } };
    }
};

export const getMaintenanceSchedule = async (product?: string) => {
    try {
        const params = product && product !== 'all' ? `?product=${product}` : '';
        const response = await api.get(`/fleet/maintenance-schedule${params}`);
        return response.data;
    } catch (error) {
        return { schedule: [] };
    }
};

export const chatWithAgent = async (agentId: string, message: string) => {
    const response = await api.post('/chat', { agent_id: agentId, message });
    return response.data;
};

// Dashboard APIs
export const getDashboardSummary = async (product?: string, startDate?: string, endDate?: string) => {
    try {
        const params = new URLSearchParams();
        if (product && product !== 'all') params.set('product', product);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await api.get(`/dashboard/summary${qs}`);
        return response.data;
    } catch (error) {
        console.warn('Backend unavailable, returning empty summary data.');
        return { total_calls: 0, fcr_rate: 0, containment_rate: 0, avg_csat: 0 };
    }
};
export const getDashboardMetrics = async (days = 7, product?: string, startDate?: string, endDate?: string) => {
    try {
        const params = new URLSearchParams({ days: String(days) });
        if (product && product !== 'all') params.set('product', product);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        const response = await api.get(`/dashboard/metrics?${params}`);
        return response.data;
    } catch (error) {
        return { metrics: [] };
    }
};
export const getRecentCalls = async (limit = 20, skip = 0, product?: string, startDate?: string, endDate?: string) => {
    try {
        const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
        if (product && product !== 'all') params.set('product', product);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        const response = await api.get(`/dashboard/calls?${params}`);
        return response.data;
    } catch (error) {
        return { calls: [], total: 0 };
    }
};
export const getCallDetail = async (callId: string) => {
    try {
        const response = await api.get(`/dashboard/calls/${callId}`);
        return response.data;
    } catch (error) {
        return { transcript: [] };
    }
};
export const refreshDashboard = async () => {
    const response = await api.post('/dashboard/refresh');
    return response.data; // { job_id, status: "queued" }
};

export const getRefreshStatus = async (jobId: string) => {
    const response = await api.get(`/dashboard/refresh/status/${jobId}`);
    return response.data; // { status: "queued"|"processing"|"done"|"failed", processed, failed, total, completed }
};

// Escalation Tickets
export const getEscalationTickets = async (product?: string, startDate?: string, endDate?: string) => {
    try {
        const params = new URLSearchParams();
        if (product && product !== 'all') params.set('product', product);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await api.get(`/dashboard/escalations${qs}`);
        return response.data;
    } catch (error) {
        return { tickets: [], total: 0 };
    }
};

// Sales Leads
export const getSalesLeads = async (product?: string, startDate?: string, endDate?: string) => {
    try {
        const params = new URLSearchParams();
        if (product && product !== 'all') params.set('product', product);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await api.get(`/dashboard/sales-leads${qs}`);
        return response.data;
    } catch (error) {
        return { leads: [], total_pipeline: 0 };
    }
};

// Security Events
export const getSecurityEvents = async (startDate?: string, endDate?: string) => {
    try {
        const params = new URLSearchParams();
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await api.get(`/dashboard/events${qs}`);
        return response.data;
    } catch (error) {
        return { events: [] };
    }
};

export const getActiveCalls = async () => {
    try {
        const response = await api.get('/session/active-count');
        return response.data;
    } catch (error) {
        return { success: true, count: 0 };
    }
};

export const getRagMetrics = async (product?: string, startDate?: string, endDate?: string) => {
    try {
        const params = new URLSearchParams();
        if (product && product !== 'all') params.set('product', product);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await api.get(`/dashboard/rag-metrics${qs}`);
        return response.data;
    } catch (error) {
        return { 
            success: true,
            avg_kb_confidence: 0, 
            citation_rate: 0, 
            vector_overlap: 0, 
            modality_distribution: { text: 0, image: 0, table: 0, graph: 0 },
            recent_citations: [],
            top_cited_docs: []
        };
    }
};

// Customer Profiles
export const getCustomerProfiles = async (product?: string, limit: number = 50, search?: string, startDate?: string, endDate?: string) => {
    try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (product && product !== 'all') params.set('product', product);
        if (search) params.set('search', search);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        const response = await api.get(`/dashboard/customers?${params}`);
        return response.data;
    } catch (error) {
        return { profiles: [], total: 0 };
    }
};

export const getCustomerDetail = async (userId: string) => {
    try {
        const response = await api.get(`/dashboard/customers/${userId}`);
        return response.data;
    } catch (error) {
        return {}; // Return an empty object or null for consistency
    }
};

export const getCustomerInsights = async (product?: string, startDate?: string, endDate?: string) => {
    try {
        const params = new URLSearchParams();
        if (product && product !== 'all') params.set('product', product);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        const response = await api.get(`/dashboard/customers/insights?${params.toString()}`);
        return response.data;
    } catch (error) {
        return { success: false };
    }
};

// Calendar APIs
export const getCalendarEvents = async (year: number, month: number, product?: string) => {
    try {
        const params = new URLSearchParams({ year: String(year), month: String(month) });
        if (product && product !== 'all') params.set('product', product);
        const response = await api.get(`/dashboard/calendar?${params}`);
        return response.data;
    } catch (error) {
        return { days: {} };
    }
};

export const getCalendarStreamUrl = (year: number, month: number, product?: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (product && product !== 'all') params.set('product', product);
    return `${base}/dashboard/calendar/stream?${params}`;
};

export default api;
