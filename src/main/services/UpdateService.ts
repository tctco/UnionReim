import { BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { SettingsService } from './SettingsService';
import zh from '../../renderer/i18n/locales/zh';
import en from '../../renderer/i18n/locales/en';

type Locale = typeof en;

function getStrings(): { title: string; message: string; restartNow: string; later: string } {
  const settings = new SettingsService();
  const lang = (settings.getAppSettings().language as 'zh' | 'en' | undefined) || 'en';
  const dict: Locale = lang === 'zh' ? (zh as Locale) : (en as Locale);
  return {
    title: dict.settings.updatePromptTitle,
    message: dict.settings.updatePromptMessage,
    restartNow: dict.settings.restartNow,
    later: dict.settings.later,
  };
}

export function initAutoUpdater(): void {
  if (process.env.VITE_DEV_SERVER_URL) return; // Dev: skip updater

  try {
    autoUpdater.autoDownload = true;

    autoUpdater.on('checking-for-update', () => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('update:checking');
      }
    });
    autoUpdater.on('update-available', (info) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('update:available', info);
      }
    });
    autoUpdater.on('update-not-available', (info) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('update:not-available', info);
      }
    });
    autoUpdater.on('download-progress', (progress) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('update:progress', progress);
      }
    });
    autoUpdater.on('update-downloaded', async (info) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('update:downloaded', info);
      }
      try {
        const { title, message, restartNow, later } = getStrings();
        const { response } = await dialog.showMessageBox({
          type: 'question',
          title,
          message,
          buttons: [restartNow, later],
          defaultId: 0,
          cancelId: 1,
          noLink: true,
        });
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      } catch (e) {
        console.error('Failed showing update install prompt', e);
      }
    });
    autoUpdater.on('error', (err) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('update:error', err?.message || String(err));
      }
    });

    autoUpdater.checkForUpdatesAndNotify();
  } catch (e) {
    console.error('Auto-update init failed', e);
  }
}

