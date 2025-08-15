
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
use std::process::{Command, Stdio};
use std::io::Write;
use tauri::command;

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
fn set_relay(cmd: RelayCommand) -> Result<String, String> {
    let state = if cmd.state { "0" } else { "1" };
    let sudo_password = "orangepi"; // ⚠️ cuidado, apenas para teste/debug

    println!("DEBUG: Chamando Python com sudo");
    println!("DEBUG: pin={}, state={}", cmd.pin, state);

    let mut child = Command::new("sudo")
        .arg("-S")
        .arg("python3")
        .arg("/home/orangepi/Documents/set_relay.py")
        .arg(&cmd.pin.to_string())
        .arg(state)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Falha ao spawn do processo: {}", e))?;

    println!("DEBUG: Processo iniciado");

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(format!("{}\n", sudo_password).as_bytes())
            .map_err(|e| format!("Falha ao escrever senha no stdin: {}", e))?;
        println!("DEBUG: Senha enviada para sudo");
    } else {
        println!("DEBUG: stdin do processo não disponível!");
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Falha ao aguardar processo: {}", e))?;

    println!("DEBUG: stdout:\n{}", String::from_utf8_lossy(&output.stdout));
    println!("DEBUG: stderr:\n{}", String::from_utf8_lossy(&output.stderr));

    if !output.status.success() {
        return Err(format!(
            "Erro ao acionar GPIO: status={} stderr={}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    println!("DEBUG: GPIO acionado com sucesso");

    Ok("GPIO acionado com sucesso".into())
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
