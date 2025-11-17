// src/api/ruleService.ts
import api from './axiosConfig';
import type { Rule } from '../types/rule';

export const getRulesByFarm = (farmId: number) => {
    return api.get<{ data: Rule[] }>(`/rules?farmId=${farmId}`);
};

export const createRule = (farmId: number, rule: Rule) => {
    return api.post<Rule>('/rules', rule, { params: { farmId } });
};



// THÊM CÁC HÀM NÀY
export const toggleRuleStatus = (ruleId: number, enabled: boolean) => {
    return api.patch(`/rules/${ruleId}/toggle`, { enabled });
};

export const deleteRule = (ruleId: number) => {
    return api.delete(`/rules/${ruleId}`);
};

// THÊM CÁC HÀM NÀY
export const getRuleById = (ruleId: number) => {
    return api.get<{ data: Rule }>(`/rules/${ruleId}`);
};

export const updateRule = (ruleId: number, rule: Rule) => {
    return api.put<Rule>(`/rules/${ruleId}`, rule);
};