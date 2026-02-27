use std::sync::Mutex;
use tauri::State;
use tauri::{AppHandle, Manager};
use tauri::webview::WebviewWindowBuilder;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use windows_sys::Win32::Foundation::HWND;
use windows_sys::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
use windows_sys::Win32::UI::WindowsAndMessaging::{
  GetForegroundWindow, GetWindowThreadProcessId, SetForegroundWindow,
};

struct FocusState(Mutex<HWND>);

#[tauri::command]
fn save_foreground_window(state: State<'_, FocusState>) {
  let hwnd = unsafe { GetForegroundWindow() };
  if hwnd != 0 {
    let mut guard = state.0.lock().unwrap();
    *guard = hwnd;
  }
}


#[tauri::command]
async fn ensure_overlay_window(app: AppHandle) -> Result<(), String> {
  if app.get_webview_window("overlay").is_some() {
    return Ok(());
  }

  let cfg = app
    .config()
    .app
    .windows
    .iter()
    .find(|w| w.label == "overlay")
    .ok_or("WindowConfig 'overlay' não encontrado no tauri.conf")?
    .clone();

  WebviewWindowBuilder::from_config(&app, &cfg)
    .map_err(|e| e.to_string())?
    .build()
    .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
fn restore_foreground_window(state: State<'_, FocusState>) {
  let hwnd = {
    let guard = state.0.lock().unwrap();
    *guard
  };

  if hwnd == 0 {
    return;
  }

  unsafe {
    let mut _pid: u32 = 0;
    let fg_thread = GetWindowThreadProcessId(hwnd, &mut _pid);
    let cur_thread = GetCurrentThreadId();

    if fg_thread != 0 && cur_thread != 0 {
      AttachThreadInput(cur_thread, fg_thread, 1);
      SetForegroundWindow(hwnd);
      AttachThreadInput(cur_thread, fg_thread, 0);
    } else {
      SetForegroundWindow(hwnd);
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .manage(FocusState(Mutex::new(0)))
    .invoke_handler(tauri::generate_handler![
      save_foreground_window,
      restore_foreground_window,
      ensure_overlay_window
    ])
    .setup(|app| {

 let show = MenuItem::with_id(app, "tray_show", "Mostrar", true, None::<&str>)?;
      let hide = MenuItem::with_id(app, "tray_hide", "Esconder", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "tray_quit", "Sair", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

      let icon = app.default_window_icon().cloned();


let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .icon(icon.unwrap())
        .on_menu_event(|app, event| {
          let window = app.get_webview_window("main");
          match event.id().as_ref() {
            "tray_show" => {
              if let Some(w) = window {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
              }
            }
            "tray_hide" => {
              if let Some(w) = window {
                let _ = w.hide();
              }
            }
            "tray_quit" => {
              app.exit(0);
            }
            _ => {}
          }
        })
        .on_tray_icon_event(|tray, event| {
          // clique esquerdo no ícone -> alterna mostrar/esconder
          if let TrayIconEvent::Click { button, button_state, .. } = event {
            if button == tauri::tray::MouseButton::Left
              && button_state == tauri::tray::MouseButtonState::Up
            {
              let app = tray.app_handle();
              if let Some(w) = app.get_webview_window("main") {
                let is_visible = w.is_visible().unwrap_or(false);
                if is_visible {
                  let _ = w.hide();
                } else {
                  let _ = w.show();
                  let _ = w.unminimize();
                  let _ = w.set_focus();
                }
              }
            }
          }
        })
        .build(app)?;



      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}