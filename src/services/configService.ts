import { invoke } from '@tauri-apps/api/tauri';
import { AppConfig } from '../types/config';
import { AppConfigRust } from './tauriTypes';

/**
 * 設定を取得する
 */
export async function getConfig(): Promise<AppConfig> {
  try {
    const config = await invoke<AppConfigRust>('get_config');
    return config;
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
    // Return default config on error
    return {
      memoDirectory: '~/Documents/Memos',
      autoSaveDelay: 1000
    };
  }
}

/**
 * 設定を保存する
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  try {
    await invoke('save_config', { config });
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    throw error;
  }
}

/**
 * 設定を更新する（部分更新）
 */
export async function updateConfig(
  partialConfig: Partial<AppConfig>
): Promise<void> {
  try {
    await invoke('update_config', { partialConfig });
  } catch (error) {
    console.error('設定の更新に失敗しました:', error);
    throw error;
  }
}
