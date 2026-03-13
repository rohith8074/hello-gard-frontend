// src/CONSTS.ts
export const AGENT_ID = process.env.NEXT_PUBLIC_AGENT_ID || "";

const getApiBase = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');
        return `${base}/api/v1`;
    }
    return 'http://localhost:8000/api/v1';
};

export const API_BASE_URL = getApiBase();


