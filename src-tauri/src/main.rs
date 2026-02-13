// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod utils;

use commands::config::{get_config, save_config, update_config};
use commands::memo::{create_memo, delete_memo, list_memos, read_memo, save_memo, toggle_pin, update_memo_order, import_memo_from_dialog, import_memo_from_content};
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

fn main() {
    let edit_menu = Submenu::new("Edit", Menu::new()
        .add_native_item(MenuItem::Undo)
        .add_native_item(MenuItem::Redo)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Cut)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste)
        .add_native_item(MenuItem::SelectAll));

    let view_menu = Submenu::new("View", Menu::new()
        .add_item(CustomMenuItem::new("zoom_in", "Zoom In").accelerator("CmdOrCtrl+="))
        .add_item(CustomMenuItem::new("zoom_out", "Zoom Out").accelerator("CmdOrCtrl+-"))
        .add_item(CustomMenuItem::new("zoom_reset", "Actual Size").accelerator("CmdOrCtrl+0")));

    let menu = Menu::new()
        .add_submenu(edit_menu)
        .add_submenu(view_menu);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| {
            let window = event.window();
            match event.menu_item_id() {
                "zoom_in" => { let _ = window.emit("zoom", "in"); }
                "zoom_out" => { let _ = window.emit("zoom", "out"); }
                "zoom_reset" => { let _ = window.emit("zoom", "reset"); }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Config commands
            get_config,
            save_config,
            update_config,
            // Memo commands
            list_memos,
            read_memo,
            save_memo,
            delete_memo,
            create_memo,
            toggle_pin,
            update_memo_order,
            import_memo_from_dialog,
            import_memo_from_content,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
