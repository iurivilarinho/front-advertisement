#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::State;

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
            // BOOL no windows-sys é i32: 1 = true, 0 = false
            AttachThreadInput(cur_thread, fg_thread, 1);
            SetForegroundWindow(hwnd);
            AttachThreadInput(cur_thread, fg_thread, 0);
        } else {
            SetForegroundWindow(hwnd);
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(FocusState(Mutex::new(0)))
        .invoke_handler(tauri::generate_handler![
            save_foreground_window,
            restore_foreground_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}