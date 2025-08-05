import { GitLabApiNote } from '@src/app/git-lab-api/git-lab-note.model';

/**
 * アプリケーション内で使用するコメント（Note）モデル
 */
export interface Note {
  /**
   * コメントのID
   * @type {number}
   */
  id: number;

  /**
   * コメントの本文
   * @type {string}
   */
  body: string;

  /**
   * コメント作成者のID
   * @type {number}
   */
  author_id: number;

  /**
   * 作成日時
   * @type {Date}
   */
  created_at: Date;

  /**
   * 更新日時
   * @type {Date}
   */
  updated_at: Date;

  /**
   * 関連するissueのiid
   * @type {number}
   */
  issue_iid: number;

  /**
   * コメントがシステムノートかどうか
   * @type {boolean}
   */
  system: boolean;
}

/**
 * GitLab APIのNoteレスポンス型からNote型へ変換する関数
 * @param apiNote GitLab APIから取得したNoteデータ
 * @returns 変換されたNoteオブジェクト、またはバリデーション失敗時はnull
 */
export function convertJsonToNote(apiNote: GitLabApiNote): Note | null {
  // 必須フィールドのバリデーション
  if (
    typeof apiNote.id !== 'number' ||
    typeof apiNote.body !== 'string' ||
    typeof apiNote.created_at !== 'string' ||
    typeof apiNote.updated_at !== 'string' ||
    typeof apiNote.system !== 'boolean' ||
    typeof apiNote.noteable_id !== 'number' ||
    !apiNote.author ||
    typeof apiNote.author.id !== 'number' ||
    typeof apiNote.author.name !== 'string' ||
    typeof apiNote.author.username !== 'string'
  ) {
    return null;
  }

  // 日付の変換
  const created_at = new Date(apiNote.created_at);
  const updated_at = new Date(apiNote.updated_at);

  // 日付が無効な場合はnullを返す
  if (isNaN(created_at.getTime()) || isNaN(updated_at.getTime())) {
    return null;
  }

  return {
    id: apiNote.id,
    body: apiNote.body,
    author_id: apiNote.author.id,
    created_at,
    updated_at,
    issue_iid: apiNote.noteable_id, // GitLabのAPIではnoteable_idがissueのiidに対応
    system: apiNote.system,
  };
} 