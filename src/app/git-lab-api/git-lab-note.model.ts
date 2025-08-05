import { GitLabUser } from './git-lab-issue.model';

/**
 * GitLab APIのNotes（コメント）レスポンス型
 */
export interface GitLabApiNote {
  id: number;
  body: string;
  author: GitLabUser;
  created_at: string;
  updated_at: string;
  system: boolean;
  noteable_id: number;
  noteable_type: string;
  resolvable: boolean;
  resolved: boolean;
  confidential: boolean;
  internal: boolean;
  position?: GitLabNotePosition | null;
  commands_changes?: Record<string, unknown>;
}

/**
 * コードレビュー時の位置情報（差分コメント用）
 */
export interface GitLabNotePosition {
  base_sha: string;
  start_sha: string;
  head_sha: string;
  old_path: string;
  new_path: string;
  position_type: string;
  old_line?: number | null;
  new_line?: number | null;
  line_range?: GitLabLineRange | null;
}

/**
 * 行範囲情報
 */
export interface GitLabLineRange {
  start: {
    line_code: string;
    type: string;
    old_line?: number | null;
    new_line?: number | null;
  };
  end: {
    line_code: string;
    type: string;
    old_line?: number | null;
    new_line?: number | null;
  };
} 