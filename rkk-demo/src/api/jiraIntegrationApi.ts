import apiClient from './apiClient';
import type {
  JiraIntegration,
  JiraTestConnectionRes,
  JiraTransition,
  JiraTransitionMapping,
  UpsertJiraIntegrationReq,
  UpsertJiraTransitionMappingsReq,
} from './types';

const projectPath = (projectId: string) => `/jira-integration/projects/${projectId}`;

export const jiraIntegrationApi = {
  get: (projectId: string) =>
    apiClient.get<JiraIntegration>(projectPath(projectId)).then((r) => r.data),

  upsert: (projectId: string, data: UpsertJiraIntegrationReq) =>
    apiClient.put<JiraIntegration>(projectPath(projectId), data).then((r) => r.data),

  delete: (projectId: string) => apiClient.delete(projectPath(projectId)),

  test: (projectId: string) =>
    apiClient.post<JiraTestConnectionRes>(`${projectPath(projectId)}/test`).then((r) => r.data),

  getTransitionMappings: (projectId: string) =>
    apiClient
      .get<JiraTransitionMapping[]>(`${projectPath(projectId)}/transition-mappings`)
      .then((r) => r.data),

  upsertTransitionMappings: (projectId: string, data: UpsertJiraTransitionMappingsReq) =>
    apiClient
      .put<JiraTransitionMapping[]>(`${projectPath(projectId)}/transition-mappings`, data)
      .then((r) => r.data),

  getIssueTransitions: (projectId: string, issueKey: string) =>
    apiClient
      .get<JiraTransition[]>(`${projectPath(projectId)}/issues/${encodeURIComponent(issueKey)}/transitions`)
      .then((r) => r.data),
};
