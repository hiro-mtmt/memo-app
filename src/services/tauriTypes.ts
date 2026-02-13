// Types matching Rust command responses

export interface MemoMetadata {
  filename: string;
  title: string;
  content: string;
  createdAt: string;  // ISO 8601 string from Rust
  updatedAt: string;  // ISO 8601 string from Rust
  pinned: boolean;
  pinnedAt: string | null;  // ISO 8601 string from Rust or null
}

export interface AppConfigRust {
  memoDirectory: string;
  autoSaveDelay: number;
}
