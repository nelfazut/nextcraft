pub mod model;
pub mod renderer;
pub mod export;

use std::sync::Mutex;
use wasm_bindgen::prelude::*;
use web_sys::{window, HtmlCanvasElement};
use model::{ArtCraftProject, Layer, LayerType, Point, VectorElement};
use renderer::Renderer;

#[cfg(feature = "console_error_panic_hook")]
use console_error_panic_hook::set_once as set_panic_hook;

struct EngineState {
    project: ArtCraftProject,
    renderer: Option<Renderer>,
    dirty: bool,
    active_tool: String,
    primary_color: String,
    fill_color: Option<String>,
    stroke_width: f64,
    current_path: Vec<Point>,
    is_drawing: bool,
}

static ENGINE: Mutex<Option<EngineState>> = Mutex::new(None);

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    #[cfg(feature = "console_error_panic_hook")]
    set_panic_hook();

    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if lock.is_none() {
        *lock = Some(EngineState {
            project: ArtCraftProject::new_default("Nouveau Projet", 1920, 1080),
            renderer: None,
            dirty: false,
            active_tool: "brush".to_string(),
            primary_color: "#2563eb".to_string(),
            fill_color: None,
            stroke_width: 5.0,
            current_path: Vec::new(),
            is_drawing: false,
        });
    }
    Ok(())
}

#[wasm_bindgen]
pub fn init_canvas(canvas_id: &str) -> Result<(), JsValue> {
    let window = window().ok_or_else(|| JsValue::from_str("Window inaccessible"))?;
    let document = window.document().ok_or_else(|| JsValue::from_str("Document inaccessible"))?;
    let canvas_el = document
        .get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str(&format!("Canvas #{} introuvable", canvas_id)))?
        .dyn_into::<HtmlCanvasElement>()?;

    let renderer = Renderer::new(canvas_el)?;

    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        state.renderer = Some(renderer);
        if let Some(r) = &state.renderer {
            r.render(&state.project)?;
        }
    }
    Ok(())
}

#[wasm_bindgen]
pub fn load_project(data: &[u8]) -> Result<(), JsValue> {
    let project = ArtCraftProject::from_binary(data).map_err(|e| JsValue::from_str(&e))?;
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        state.project = project;
        state.dirty = false;
        if let Some(r) = &state.renderer {
            r.render(&state.project)?;
        }
    }
    Ok(())
}

#[wasm_bindgen]
pub fn save_project() -> Result<Vec<u8>, JsValue> {
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        let bin = state.project.to_binary().map_err(|e| JsValue::from_str(&e))?;
        state.dirty = false;
        Ok(bin)
    } else {
        Err(JsValue::from_str("Moteur non initialisé"))
    }
}

#[wasm_bindgen]
pub fn export_rendering(format: &str, _quality: u8) -> Result<Vec<u8>, JsValue> {
    let lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_ref() {
        match format.to_lowercase().as_str() {
            "svg" => {
                let svg_content = export::project_to_svg(&state.project);
                Ok(svg_content.into_bytes())
            }
            "json" => {
                let json_str = serde_json::to_string_pretty(&state.project).map_err(|e| JsValue::from_str(&e.to_string()))?;
                Ok(json_str.into_bytes())
            }
            _ => {
                // Par défaut renvoie le binaire .craft
                state.project.to_binary().map_err(|e| JsValue::from_str(&e))
            }
        }
    } else {
        Err(JsValue::from_str("Moteur non initialisé"))
    }
}

#[wasm_bindgen]
pub fn is_dirty() -> bool {
    if let Ok(lock) = ENGINE.lock() {
        if let Some(state) = lock.as_ref() {
            return state.dirty;
        }
    }
    false
}

#[wasm_bindgen]
pub fn mark_clean() {
    if let Ok(mut lock) = ENGINE.lock() {
        if let Some(state) = lock.as_mut() {
            state.dirty = false;
        }
    }
}

#[wasm_bindgen]
pub fn resize_canvas(width: u32, height: u32, scale: f64) -> Result<(), JsValue> {
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        if let Some(r) = state.renderer.as_mut() {
            r.resize(width, height, scale);
            r.render(&state.project)?;
        }
    }
    Ok(())
}

#[wasm_bindgen]
pub fn get_project_meta() -> Result<String, JsValue> {
    let lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_ref() {
        serde_json::to_string(&serde_json::json!({
            "id": state.project.id,
            "name": state.project.name,
            "width": state.project.width,
            "height": state.project.height,
            "layersCount": state.project.layers.len(),
            "activeLayerId": state.project.active_layer_id,
            "isDirty": state.dirty
        })).map_err(|e| JsValue::from_str(&e.to_string()))
    } else {
        Err(JsValue::from_str("Moteur non initialisé"))
    }
}

#[wasm_bindgen]
pub fn get_layers_json() -> Result<String, JsValue> {
    let lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_ref() {
        serde_json::to_string(&state.project.layers).map_err(|e| JsValue::from_str(&e.to_string()))
    } else {
        Err(JsValue::from_str("Moteur non initialisé"))
    }
}

#[wasm_bindgen]
pub fn set_tool(tool_name: &str) {
    if let Ok(mut lock) = ENGINE.lock() {
        if let Some(state) = lock.as_mut() {
            state.active_tool = tool_name.to_string();
        }
    }
}

#[wasm_bindgen]
pub fn set_color(hex: &str) {
    if let Ok(mut lock) = ENGINE.lock() {
        if let Some(state) = lock.as_mut() {
            state.primary_color = hex.to_string();
        }
    }
}

#[wasm_bindgen]
pub fn set_stroke_width(w: f64) {
    if let Ok(mut lock) = ENGINE.lock() {
        if let Some(state) = lock.as_mut() {
            state.stroke_width = w;
        }
    }
}

#[wasm_bindgen]
pub fn add_layer(name: &str, layer_type_str: &str) -> Result<String, JsValue> {
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        let id = format!("layer_{}", js_sys::Date::now() as u64);
        let ltype = match layer_type_str {
            "raster" => LayerType::Raster,
            "text" => LayerType::Text,
            _ => LayerType::Vector,
        };
        let mut new_layer = Layer::new_vector(id.clone(), name.to_string());
        new_layer.layer_type = ltype;
        state.project.layers.push(new_layer);
        state.project.active_layer_id = Some(id.clone());
        state.dirty = true;
        if let Some(r) = &state.renderer {
            r.render(&state.project)?;
        }
        Ok(id)
    } else {
        Err(JsValue::from_str("Moteur non initialisé"))
    }
}

#[wasm_bindgen]
pub fn delete_layer(layer_id: &str) -> Result<(), JsValue> {
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        if state.project.layers.len() <= 1 {
            return Err(JsValue::from_str("Impossible de supprimer le seul calque restant"));
        }
        state.project.layers.retain(|l| l.id != layer_id);
        if state.project.active_layer_id.as_deref() == Some(layer_id) {
            state.project.active_layer_id = state.project.layers.last().map(|l| l.id.clone());
        }
        state.dirty = true;
        if let Some(r) = &state.renderer {
            r.render(&state.project)?;
        }
    }
    Ok(())
}

#[wasm_bindgen]
pub fn set_active_layer(layer_id: &str) -> Result<(), JsValue> {
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        state.project.active_layer_id = Some(layer_id.to_string());
    }
    Ok(())
}

#[wasm_bindgen]
pub fn set_layer_visibility(layer_id: &str, visible: bool) -> Result<(), JsValue> {
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        if let Some(layer) = state.project.layers.iter_mut().find(|l| l.id == layer_id) {
            layer.visible = visible;
            state.dirty = true;
            if let Some(r) = &state.renderer {
                r.render(&state.project)?;
            }
        }
    }
    Ok(())
}

#[wasm_bindgen]
pub fn handle_pointer_down(x: f64, y: f64, button: i32) -> Result<(), JsValue> {
    if button != 0 {
        return Ok(());
    }
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        state.is_drawing = true;
        state.current_path = vec![Point { x, y }];
    }
    Ok(())
}

#[wasm_bindgen]
pub fn handle_pointer_move(x: f64, y: f64, buttons: i32) -> Result<(), JsValue> {
    if buttons != 1 {
        return Ok(());
    }
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        if state.is_drawing {
            state.current_path.push(Point { x, y });
        }
    }
    Ok(())
}

#[wasm_bindgen]
pub fn handle_pointer_up(x: f64, y: f64, _button: i32) -> Result<(), JsValue> {
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        if !state.is_drawing {
            return Ok(());
        }
        state.is_drawing = false;
        state.current_path.push(Point { x, y });

        let pts = state.current_path.clone();
        if pts.len() >= 2 {
            let color = state.primary_color.clone();
            let width = state.stroke_width;

            let elem = match state.active_tool.as_str() {
                "rect" => {
                    let first = &pts[0];
                    let last = pts.last().unwrap();
                    let rx = first.x.min(last.x);
                    let ry = first.y.min(last.y);
                    let rw = (last.x - first.x).abs();
                    let rh = (last.y - first.y).abs();
                    VectorElement::Rect {
                        x: rx,
                        y: ry,
                        width: rw,
                        height: rh,
                        stroke: Some(color),
                        fill: state.fill_color.clone(),
                        stroke_width: width,
                        radius: 0.0,
                    }
                }
                "ellipse" => {
                    let first = &pts[0];
                    let last = pts.last().unwrap();
                    let cx = (first.x + last.x) / 2.0;
                    let cy = (first.y + last.y) / 2.0;
                    let rx = (last.x - first.x).abs() / 2.0;
                    let ry = (last.y - first.y).abs() / 2.0;
                    VectorElement::Ellipse {
                        cx,
                        cy,
                        rx,
                        ry,
                        stroke: Some(color),
                        fill: state.fill_color.clone(),
                        stroke_width: width,
                    }
                }
                "line" => {
                    let first = &pts[0];
                    let last = pts.last().unwrap();
                    VectorElement::Line {
                        x1: first.x,
                        y1: first.y,
                        x2: last.x,
                        y2: last.y,
                        stroke: color,
                        stroke_width: width,
                    }
                }
                _ => VectorElement::Path {
                    points: pts,
                    stroke: color,
                    fill: None,
                    stroke_width: width,
                    closed: false,
                },
            };

            // Ajout de l'élément au calque actif
            let active_id = state.project.active_layer_id.clone();
            if let Some(target_id) = active_id {
                if let Some(l) = state.project.layers.iter_mut().find(|l| l.id == target_id) {
                    l.elements.push(elem);
                    state.dirty = true;
                }
            }
        }
        state.current_path.clear();

        if let Some(r) = &state.renderer {
            r.render(&state.project)?;
        }
    }
    Ok(())
}

#[wasm_bindgen]
pub fn import_image_layer(name: &str, img_data: &str, x: f64, y: f64) -> Result<String, JsValue> {
    let mut lock = ENGINE.lock().map_err(|e| JsValue::from_str(&e.to_string()))?;
    if let Some(state) = lock.as_mut() {
        let id = format!("layer_img_{}", js_sys::Date::now() as u64);
        let mut layer = Layer::new_image(id.clone(), name.to_string(), img_data.to_string());
        layer.transform.x = x;
        layer.transform.y = y;
        state.project.layers.push(layer);
        state.project.active_layer_id = Some(id.clone());
        state.dirty = true;
        if let Some(r) = &state.renderer {
            r.render(&state.project)?;
        }
        Ok(id)
    } else {
        Err(JsValue::from_str("Moteur non initialisé"))
    }
}

#[wasm_bindgen]
pub fn create_default_project(name: &str, width: u32, height: u32) -> Result<Vec<u8>, JsValue> {
    let proj = ArtCraftProject::new_default(name, width, height);
    proj.to_binary().map_err(|e| JsValue::from_str(&e))
}
