
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serialport::SerialPort;
use std::{thread, time::Duration};
use tauri::{Manager, Emitter};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::io::{self, Read};
use std::process::Command;

#[derive(serde::Deserialize)]
struct RelayCommand {
    pin: u32,
    state: bool, // true = liga, false = desliga
}

#[derive(serde::Deserialize)]
struct UARTConfig {
    port_name: String,
    baud_rate: u32,
}

#[tauri::command]
fn start_uart(app_handle: tauri::AppHandle, configs: Vec<UARTConfig>) {
    for cfg in configs {
        let app = app_handle.clone();
        let port_name = cfg.port_name.clone();
        let baud = cfg.baud_rate;

        thread::spawn(move || {
            match serialport::new(&port_name, baud)
                .timeout(Duration::from_millis(100))
                .open()
            {
                Ok(mut port) => {
                    let mut buffer = [0u8; 1024];
                    loop {
                        match port.read(&mut buffer) {
                            Ok(bytes_read) if bytes_read > 0 => {
                                if let Ok(data) = std::str::from_utf8(&buffer[..bytes_read]) {
                                    let payload = format!("{}|{}", port_name, data.trim());
                                    let _ = app.emit("uart-data", payload);
                                }
                            }
                            Ok(_) => {} // Sem dados
                            Err(ref e) if e.kind() == io::ErrorKind::TimedOut => {}
                            Err(e) => {
                                eprintln!("Erro lendo {}: {:?}", port_name, e);
                                break;
                            }
                        }
                    }
                }
                Err(e) => eprintln!("Erro abrindo {}: {:?}", port_name, e),
            }
        });
    }
}

#[tauri::command]
fn set_relay(cmd: RelayCommand) -> Result<(), String> {
    // Define o pino como saída
    Command::new("gpio")
        .args(["mode", &cmd.pin.to_string(), "out"])
        .output()
        .map_err(|e| e.to_string())?;

    // Liga (1) ou desliga (0)
    let value = if cmd.state { "1" } else { "0" };
    Command::new("gpio")
        .args(["write", &cmd.pin.to_string(), value])
        .output()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![start_uart, set_relay])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
