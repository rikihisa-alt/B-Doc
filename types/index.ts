// =============================================================================
// B-Doc 書類発行システム - TypeScript 型定義
// =============================================================================

// =============================================================================
// 1. 書類ステータス定数・型
// =============================================================================

/** 書類のステータス定数 */
export const DOCUMENT_STATUS = {
  /** 下書き */
  DRAFT: 'draft',
  /** 確認待ち */
  PENDING_CONFIRM: 'pending_confirm',
  /** 差し戻し */
  RETURNED: 'returned',
  /** 承認待ち */
  PENDING_APPROVAL: 'pending_approval',
  /** 承認済み */
  APPROVED: 'approved',
  /** 発行処理中 */
  ISSUING: 'issuing',
  /** 発行済み */
  ISSUED: 'issued',
  /** 送付済み */
  SENT: 'sent',
  /** 取消 */
  CANCELLED: 'cancelled',
  /** 期限切れ */
  EXPIRED: 'expired',
} as const;

/** 書類ステータスの型 */
export type DocumentStatus =
  (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

// =============================================================================
// 2. ユーザーロール定数・型
// =============================================================================

/** ユーザーロール定数 */
export const USER_ROLES = {
  /** システム管理者 */
  SYSTEM_ADMIN: 'system_admin',
  /** 書類管理者 */
  DOC_CONTROLLER: 'doc_controller',
  /** テンプレート管理者 */
  TEMPLATE_MANAGER: 'template_manager',
  /** 書類作成者 */
  CREATOR: 'creator',
  /** 確認者 */
  CONFIRMER: 'confirmer',
  /** 承認者 */
  APPROVER: 'approver',
  /** 発行者 */
  ISSUER: 'issuer',
  /** 閲覧者 */
  VIEWER: 'viewer',
  /** 監査閲覧者 */
  AUDIT_VIEWER: 'audit_viewer',
} as const;

/** ユーザーロールの型 */
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// =============================================================================
// 3. 監査操作種別
// =============================================================================

/** 監査ログの操作種別定数 */
export const AUDIT_OPERATIONS = {
  /** 作成 */
  CREATE: 'create',
  /** 更新 */
  UPDATE: 'update',
  /** 削除 */
  DELETE: 'delete',
  /** ステータス変更 */
  STATUS_CHANGE: 'status_change',
  /** 承認 */
  APPROVE: 'approve',
  /** 却下 */
  REJECT: 'reject',
  /** 差し戻し */
  RETURN: 'return',
  /** 発行 */
  ISSUE: 'issue',
  /** 送付 */
  SEND: 'send',
  /** 取消 */
  CANCEL: 'cancel',
  /** ダウンロード */
  DOWNLOAD: 'download',
  /** 閲覧 */
  VIEW: 'view',
  /** ログイン */
  LOGIN: 'login',
  /** ログアウト */
  LOGOUT: 'logout',
} as const;

/** 監査操作種別の型 */
export type AuditOperation =
  (typeof AUDIT_OPERATIONS)[keyof typeof AUDIT_OPERATIONS];

/** 監査アクションの型（writeAuditLog で使用） */
export type AuditAction = AuditOperation;

/** 文書種別の日本語ラベル */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  employment_cert: '在職証明書',
  invoice: '請求書',
  quotation: '見積書',
  resignation: '退職証明書',
  contract: '契約書',
  employment_contract: '雇用契約書',
  nda: '秘密保持契約書',
  outsourcing_contract: '業務委託契約書',
  ringi: '稟議書',
  internal_notice: '社内通達',
  offer_letter: '採用通知書',
  personnel_order: '辞令',
  incident_report: '始末書',
  meeting_minutes: '議事録',
  delivery_note: '納品書',
  receipt: '領収書',
  report: '報告書',
  notification: '通知書',
  certificate: '証明書',
  other: 'その他',
};

/** ユーザーロールの日本語ラベル */
export const USER_ROLE_LABELS: Record<string, string> = {
  system_admin: 'システム管理者',
  doc_controller: '文書管理者',
  template_manager: 'テンプレート管理者',
  creator: '作成者',
  confirmer: '確認者',
  approver: '承認者',
  issuer: '発行者',
  viewer: '閲覧者',
  audit_viewer: '監査閲覧者',
};

// =============================================================================
// 4. ステータス遷移ルール
// =============================================================================

/** 各ステータスから遷移可能なステータスのマッピング */
const STATUS_TRANSITIONS: Record<DocumentStatus, readonly DocumentStatus[]> = {
  [DOCUMENT_STATUS.DRAFT]: [
    DOCUMENT_STATUS.PENDING_CONFIRM,
    DOCUMENT_STATUS.CANCELLED,
  ],
  [DOCUMENT_STATUS.PENDING_CONFIRM]: [
    DOCUMENT_STATUS.PENDING_APPROVAL,
    DOCUMENT_STATUS.RETURNED,
    DOCUMENT_STATUS.CANCELLED,
  ],
  [DOCUMENT_STATUS.RETURNED]: [
    DOCUMENT_STATUS.PENDING_CONFIRM,
    DOCUMENT_STATUS.CANCELLED,
  ],
  [DOCUMENT_STATUS.PENDING_APPROVAL]: [
    DOCUMENT_STATUS.APPROVED,
    DOCUMENT_STATUS.RETURNED,
    DOCUMENT_STATUS.CANCELLED,
  ],
  [DOCUMENT_STATUS.APPROVED]: [
    DOCUMENT_STATUS.ISSUING,
    DOCUMENT_STATUS.CANCELLED,
  ],
  [DOCUMENT_STATUS.ISSUING]: [
    DOCUMENT_STATUS.ISSUED,
    DOCUMENT_STATUS.CANCELLED,
  ],
  [DOCUMENT_STATUS.ISSUED]: [
    DOCUMENT_STATUS.SENT,
    DOCUMENT_STATUS.EXPIRED,
    DOCUMENT_STATUS.CANCELLED,
  ],
  [DOCUMENT_STATUS.SENT]: [DOCUMENT_STATUS.EXPIRED],
  [DOCUMENT_STATUS.CANCELLED]: [],
  [DOCUMENT_STATUS.EXPIRED]: [],
};

/**
 * ステータス遷移が可能かどうかを判定する
 * @param from - 現在のステータス
 * @param to - 遷移先のステータス
 * @returns 遷移可能な場合 true
 */
export function canTransition(
  from: DocumentStatus,
  to: DocumentStatus
): boolean {
  const allowed = STATUS_TRANSITIONS[from];
  return allowed.includes(to);
}

/**
 * 指定ステータスから遷移可能なステータス一覧を取得する
 * @param from - 現在のステータス
 * @returns 遷移可能なステータスの配列
 */
export function getAvailableTransitions(
  from: DocumentStatus
): readonly DocumentStatus[] {
  return STATUS_TRANSITIONS[from];
}

// =============================================================================
// 5. データベース型（Supabase テーブル対応）
// =============================================================================

/** 組織テーブルの型 */
export interface Organization {
  /** 組織ID (UUID) */
  id: string;
  /** 組織名 */
  name: string;
  /** 組織のスラッグ（URL用識別子） */
  slug: string;
  /** 組織のロゴURL */
  logo_url: string | null;
  /** 契約プラン */
  plan: 'free' | 'standard' | 'professional' | 'enterprise';
  /** 有効フラグ */
  is_active: boolean;
  /** 組織設定（JSON） */
  settings: OrganizationSettings;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/** 組織設定の型 */
export interface OrganizationSettings {
  /** デフォルトの承認フロー有効化 */
  require_approval: boolean;
  /** 書類の有効期限（日数、null は無期限） */
  default_expiry_days: number | null;
  /** 通知設定 */
  notifications: {
    /** メール通知有効化 */
    email_enabled: boolean;
    /** Slack 通知有効化 */
    slack_enabled: boolean;
    /** Slack Webhook URL */
    slack_webhook_url: string | null;
  };
  /** 書類番号のプレフィックス */
  document_number_prefix: string;
}

/** ユーザープロフィールテーブルの型 */
export interface UserProfile {
  /** ユーザーID（Supabase Auth の UID） */
  id: string;
  /** 所属組織ID */
  organization_id: string;
  /** メールアドレス */
  email: string;
  /** 表示名 */
  display_name: string;
  /** アバター画像URL */
  avatar_url: string | null;
  /** 割り当てられたロール一覧 */
  roles: UserRole[];
  /** 部署名 */
  department: string | null;
  /** 役職 */
  position: string | null;
  /** 有効フラグ */
  is_active: boolean;
  /** 最終ログイン日時 */
  last_login_at: string | null;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/** テンプレートテーブルの型 */
export interface Template {
  /** テンプレートID (UUID) */
  id: string;
  /** 所属組織ID */
  organization_id: string;
  /** テンプレート名 */
  name: string;
  /** 文書種別 */
  document_type: string;
  /** テンプレートの説明 */
  description: string | null;
  /** 公開フラグ */
  is_published: boolean;
  /** 作成者のユーザーID */
  created_by: string;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
  /** 論理削除日時 */
  deleted_at: string | null;
}

/** テンプレートバージョンテーブルの型 */
export interface TemplateVersion {
  /** バージョンID (UUID) */
  id: string;
  /** テンプレートID */
  template_id: string;
  /** バージョン番号 */
  version: number;
  /** テンプレート構造（ブロック定義） */
  body: Record<string, unknown>;
  /** 変数定義 */
  variables: TemplateVariable[];
  /** レイアウト設定 */
  layout: TemplateLayout | null;
  /** 有効開始日 */
  valid_from: string | null;
  /** 有効終了日 */
  valid_until: string | null;
  /** 下書きフラグ */
  is_draft: boolean;
  /** 作成者のユーザーID */
  created_by: string;
  /** 作成日時 */
  created_at: string;
}

/** 書類テーブルの型 */
export interface Document {
  /** 書類ID (UUID) */
  id: string;
  /** 所属組織ID */
  organization_id: string;
  /** 使用テンプレートID */
  template_id: string;
  /** 使用テンプレートバージョンID */
  template_version_id: string;
  /** 書類番号（組織内で一意） */
  document_number: string;
  /** 書類タイトル */
  title: string;
  /** 現在のステータス */
  status: DocumentStatus;
  /** 書類の発行日 */
  issued_date: string | null;
  /** 書類の有効期限 */
  expiry_date: string | null;
  /** 宛先情報 */
  recipient: DocumentRecipient | null;
  /** 書類メタデータ */
  metadata: Record<string, string | number | boolean>;
  /** 作成者のユーザーID */
  created_by: string;
  /** 更新者のユーザーID */
  updated_by: string;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/** 書類の宛先情報 */
export interface DocumentRecipient {
  /** 宛先名（会社名・個人名） */
  name: string;
  /** 部署名 */
  department: string | null;
  /** 担当者名 */
  attention: string | null;
  /** メールアドレス */
  email: string | null;
  /** 郵送先住所 */
  address: string | null;
}

/** 書類入力値テーブルの型 */
export interface DocumentValue {
  /** レコードID (UUID) */
  id: string;
  /** 書類ID */
  document_id: string;
  /** テンプレート変数名 */
  variable_name: string;
  /** 入力値（文字列で保存） */
  value: string;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/** 承認レコードテーブルの型 */
export interface ApprovalRecord {
  /** 承認レコードID (UUID) */
  id: string;
  /** 書類ID */
  document_id: string;
  /** ワークフローステップID */
  workflow_step_id: string | null;
  /** 承認者のユーザーID */
  approver_id: string;
  /** 承認アクション */
  action: 'approve' | 'reject' | 'return' | 'confirm';
  /** コメント */
  comment: string | null;
  /** 承認順序 */
  step_order: number;
  /** 承認日時 */
  acted_at: string;
  /** 作成日時 */
  created_at: string;
}

/** 監査ログテーブルの型 */
export interface AuditLog {
  /** 監査ログID (UUID) */
  id: string;
  /** 組織ID */
  organization_id: string;
  /** 操作種別 */
  operation: AuditOperation;
  /** 対象テーブル名 */
  target_table: string;
  /** 対象レコードID */
  target_id: string;
  /** 操作実行者のユーザーID */
  performed_by: string;
  /** 変更前の値 */
  old_values: Record<string, unknown> | null;
  /** 変更後の値 */
  new_values: Record<string, unknown> | null;
  /** IPアドレス */
  ip_address: string | null;
  /** ユーザーエージェント */
  user_agent: string | null;
  /** 作成日時 */
  created_at: string;
}

/** ワークフロー定義テーブルの型 */
export interface WorkflowDefinition {
  /** ワークフローID (UUID) */
  id: string;
  /** 組織ID */
  organization_id: string;
  /** ワークフロー名 */
  name: string;
  /** ワークフローの説明 */
  description: string | null;
  /** 適用対象のテンプレートカテゴリ */
  target_category: string | null;
  /** 適用対象のテンプレートID（null の場合はカテゴリ全体） */
  target_template_id: string | null;
  /** ワークフローのステップ定義 */
  steps: WorkflowStep[];
  /** 有効フラグ */
  is_active: boolean;
  /** 作成者のユーザーID */
  created_by: string;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

// =============================================================================
// 6. ワークフロー型
// =============================================================================

/** ワークフローステップの型 */
export interface WorkflowStep {
  /** ステップID */
  id: string;
  /** ステップ名 */
  name: string;
  /** ステップの順序 */
  order: number;
  /** ステップ種別 */
  type: 'confirm' | 'approve' | 'issue';
  /** 担当者のユーザーID一覧 */
  assignee_ids: string[];
  /** 担当者のロール（ユーザーID未指定時にロールで割当） */
  assignee_role: UserRole | null;
  /** 承認に必要な人数（null の場合は全員） */
  required_count: number | null;
  /** スキップ条件 */
  skip_condition: WorkflowCondition | null;
  /** 自動承認条件 */
  auto_approve_condition: WorkflowCondition | null;
  /** 期限（時間単位） */
  deadline_hours: number | null;
  /** 期限超過時の動作 */
  deadline_action: 'notify' | 'escalate' | 'auto_approve' | null;
}

/** ワークフロー条件の型 */
export interface WorkflowCondition {
  /** 条件の種別 */
  type:
    | 'field_value'
    | 'amount_threshold'
    | 'category_match'
    | 'role_check'
    | 'compound';
  /** 対象フィールド名 */
  field: string | null;
  /** 比較演算子 */
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'not_in'
    | 'contains';
  /** 比較値 */
  value: string | number | boolean | string[];
  /** 複合条件の場合の論理演算子 */
  logic: 'and' | 'or' | null;
  /** 複合条件のサブ条件 */
  conditions: WorkflowCondition[] | null;
}

// =============================================================================
// 7. テンプレート変数型
// =============================================================================

/** テンプレート変数の型 */
export interface TemplateVariable {
  /** 変数名（テンプレート内での識別子） */
  name: string;
  /** 表示ラベル */
  label: string;
  /** 変数のデータ型 */
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  /** 必須フラグ */
  required: boolean;
  /** デフォルト値 */
  default_value: string | null;
  /** プレースホルダーテキスト */
  placeholder: string | null;
  /** ヘルプテキスト（入力補助） */
  help_text: string | null;
  /** バリデーションルール */
  validation: TemplateVariableValidation | null;
  /** 選択肢（type が 'select' の場合） */
  options: SelectOption[] | null;
  /** 表示順 */
  display_order: number;
  /** 表示条件（他の変数の値に依存する場合） */
  visible_condition: VariableVisibleCondition | null;
}

/** テンプレート変数のバリデーションルール */
export interface TemplateVariableValidation {
  /** 最小値（number 型の場合） */
  min: number | null;
  /** 最大値（number 型の場合） */
  max: number | null;
  /** 最小文字数（text 型の場合） */
  min_length: number | null;
  /** 最大文字数（text 型の場合） */
  max_length: number | null;
  /** 正規表現パターン（text 型の場合） */
  pattern: string | null;
  /** バリデーションエラーメッセージ */
  message: string | null;
}

/** セレクト選択肢の型 */
export interface SelectOption {
  /** 選択肢の値 */
  value: string;
  /** 選択肢の表示ラベル */
  label: string;
}

/** 変数の表示条件 */
export interface VariableVisibleCondition {
  /** 依存する変数名 */
  depends_on: string;
  /** 比較演算子 */
  operator: 'eq' | 'neq' | 'in' | 'not_in';
  /** 比較値 */
  value: string | string[];
}

/** テンプレートレイアウト設定 */
export interface TemplateLayout {
  /** 用紙サイズ */
  paper_size: 'A4' | 'A3' | 'B4' | 'B5' | 'letter';
  /** 用紙の向き */
  orientation: 'portrait' | 'landscape';
  /** 余白設定（mm 単位） */
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** ヘッダー設定 */
  header: {
    enabled: boolean;
    content: string | null;
    height: number;
  };
  /** フッター設定 */
  footer: {
    enabled: boolean;
    content: string | null;
    height: number;
  };
}

// =============================================================================
// 8. ステータスバッジマップ（UI 用）
// =============================================================================

/** ステータスバッジの表示情報 */
export interface StatusBadgeInfo {
  /** 表示ラベル */
  label: string;
  /** バッジの色（Tailwind CSS カラー名） */
  color:
    | 'gray'
    | 'yellow'
    | 'orange'
    | 'blue'
    | 'green'
    | 'purple'
    | 'red'
    | 'emerald'
    | 'indigo';
  /** アイコン名 */
  icon: string;
}

/** ステータスバッジの定義マップ */
export const STATUS_BADGE_MAP: Record<DocumentStatus, StatusBadgeInfo> = {
  [DOCUMENT_STATUS.DRAFT]: {
    label: '下書き',
    color: 'gray',
    icon: 'PencilIcon',
  },
  [DOCUMENT_STATUS.PENDING_CONFIRM]: {
    label: '確認待ち',
    color: 'yellow',
    icon: 'ClockIcon',
  },
  [DOCUMENT_STATUS.RETURNED]: {
    label: '差し戻し',
    color: 'orange',
    icon: 'ArrowUturnLeftIcon',
  },
  [DOCUMENT_STATUS.PENDING_APPROVAL]: {
    label: '承認待ち',
    color: 'blue',
    icon: 'HandRaisedIcon',
  },
  [DOCUMENT_STATUS.APPROVED]: {
    label: '承認済み',
    color: 'green',
    icon: 'CheckCircleIcon',
  },
  [DOCUMENT_STATUS.ISSUING]: {
    label: '発行処理中',
    color: 'purple',
    icon: 'CogIcon',
  },
  [DOCUMENT_STATUS.ISSUED]: {
    label: '発行済み',
    color: 'emerald',
    icon: 'DocumentCheckIcon',
  },
  [DOCUMENT_STATUS.SENT]: {
    label: '送付済み',
    color: 'indigo',
    icon: 'PaperAirplaneIcon',
  },
  [DOCUMENT_STATUS.CANCELLED]: {
    label: '取消',
    color: 'red',
    icon: 'XCircleIcon',
  },
  [DOCUMENT_STATUS.EXPIRED]: {
    label: '期限切れ',
    color: 'gray',
    icon: 'ExclamationTriangleIcon',
  },
};

// =============================================================================
// 9. API レスポンス型
// =============================================================================

/** API レスポンスの基本型（成功時） */
export interface ApiSuccessResponse<T> {
  /** 成功フラグ */
  success: true;
  /** レスポンスデータ */
  data: T;
  /** メッセージ（任意） */
  message?: string;
}

/** API レスポンスの基本型（エラー時） */
export interface ApiErrorResponse {
  /** 成功フラグ */
  success: false;
  /** エラー情報 */
  error: {
    /** エラーコード */
    code: string;
    /** エラーメッセージ */
    message: string;
    /** フィールド別エラー詳細 */
    details?: Record<string, string[]>;
  };
}

/** API レスポンスのユニオン型 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** ページネーション付きリストレスポンス */
export interface PaginatedResponse<T> {
  /** データ一覧 */
  items: T[];
  /** 総件数 */
  total_count: number;
  /** 現在のページ番号（1始まり） */
  page: number;
  /** 1ページあたりの件数 */
  per_page: number;
  /** 総ページ数 */
  total_pages: number;
  /** 次のページが存在するか */
  has_next: boolean;
  /** 前のページが存在するか */
  has_previous: boolean;
}

/** ページネーション付き API レスポンス */
export type PaginatedApiResponse<T> = ApiResponse<PaginatedResponse<T>>;

// =============================================================================
// 10. フォーム・バリデーション型
// =============================================================================

/** 書類作成フォームの入力型 */
export interface DocumentCreateForm {
  /** テンプレートID */
  template_id: string;
  /** 書類タイトル */
  title: string;
  /** 宛先情報 */
  recipient: DocumentRecipient | null;
  /** テンプレート変数の入力値 */
  values: Record<string, string>;
}

/** 書類更新フォームの入力型 */
export interface DocumentUpdateForm {
  /** 書類タイトル */
  title?: string;
  /** 宛先情報 */
  recipient?: DocumentRecipient | null;
  /** テンプレート変数の入力値 */
  values?: Record<string, string>;
}

/** 承認アクションフォームの入力型 */
export interface ApprovalActionForm {
  /** アクション種別 */
  action: 'approve' | 'reject' | 'return' | 'confirm';
  /** コメント */
  comment: string | null;
}

/** テンプレート作成フォームの入力型 */
export interface TemplateCreateForm {
  /** テンプレート名 */
  name: string;
  /** テンプレートの説明 */
  description: string | null;
  /** カテゴリ */
  category: string;
  /** テンプレート本体（HTML/JSON） */
  content: string;
  /** レイアウト設定 */
  layout: TemplateLayout;
  /** 変数定義 */
  variables: TemplateVariable[];
}

/** テンプレート更新フォームの入力型 */
export interface TemplateUpdateForm {
  /** テンプレート名 */
  name?: string;
  /** テンプレートの説明 */
  description?: string | null;
  /** カテゴリ */
  category?: string;
  /** テンプレート本体（HTML/JSON） */
  content?: string;
  /** レイアウト設定 */
  layout?: TemplateLayout;
  /** 変数定義 */
  variables?: TemplateVariable[];
  /** 変更メモ（新バージョン作成時） */
  change_note?: string;
}

/** ワークフロー作成フォームの入力型 */
export interface WorkflowCreateForm {
  /** ワークフロー名 */
  name: string;
  /** 説明 */
  description: string | null;
  /** 適用対象カテゴリ */
  target_category: string | null;
  /** 適用対象テンプレートID */
  target_template_id: string | null;
  /** ステップ定義 */
  steps: WorkflowStep[];
}

/** ユーザー招待フォームの入力型 */
export interface UserInviteForm {
  /** メールアドレス */
  email: string;
  /** 表示名 */
  display_name: string;
  /** 割り当てロール */
  roles: UserRole[];
  /** 部署名 */
  department: string | null;
  /** 役職 */
  position: string | null;
}

/** バリデーションエラーの型 */
export interface ValidationError {
  /** エラーが発生したフィールドのパス */
  field: string;
  /** エラーメッセージ */
  message: string;
  /** エラーの種別 */
  type: 'required' | 'format' | 'min' | 'max' | 'pattern' | 'custom';
}

/** フォームバリデーション結果の型 */
export interface ValidationResult {
  /** バリデーション通過フラグ */
  valid: boolean;
  /** エラー一覧（valid が false の場合） */
  errors: ValidationError[];
}

// =============================================================================
// 11. ヘルパー型
// =============================================================================

/** 書類一覧の検索フィルター */
export interface DocumentSearchFilter {
  /** ステータスでフィルタ */
  status?: DocumentStatus[];
  /** テンプレートIDでフィルタ */
  template_id?: string;
  /** 作成者IDでフィルタ */
  created_by?: string;
  /** キーワード検索（タイトル・書類番号） */
  keyword?: string;
  /** 作成日の開始範囲 */
  created_from?: string;
  /** 作成日の終了範囲 */
  created_to?: string;
  /** ソートフィールド */
  sort_by?:
    | 'created_at'
    | 'updated_at'
    | 'document_number'
    | 'title'
    | 'status';
  /** ソート順 */
  sort_order?: 'asc' | 'desc';
}

/** 監査ログの検索フィルター */
export interface AuditLogSearchFilter {
  /** 操作種別でフィルタ */
  operation?: AuditOperation[];
  /** 対象テーブルでフィルタ */
  target_table?: string;
  /** 操作者IDでフィルタ */
  performed_by?: string;
  /** 期間の開始 */
  from?: string;
  /** 期間の終了 */
  to?: string;
}

/** データベーステーブルの Insert 型（id と日時フィールドを除外） */
export type InsertPayload<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/** データベーステーブルの Update 型（全フィールドを任意に） */
export type UpdatePayload<T> = Partial<Omit<T, 'id' | 'created_at'>>;
