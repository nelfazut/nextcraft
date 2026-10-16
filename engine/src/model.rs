use serde::{Deserialize, Serialize};

pub const CRAFT_MAGIC: &[u8; 6] = b"CRAFT1";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transform {
    pub x: f64,
    pub y: f64,
    pub scale_x: f64,
    pub scale_y: f64,
    pub rotation: f64,
}

impl Default for Transform {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            scale_x: 1.0,
            scale_y: 1.0,
            rotation: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum VectorElement {
    Path {
        points: Vec<Point>,
        stroke: String,
        fill: Option<String>,
        stroke_width: f64,
        closed: bool,
    },
    Rect {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        stroke: Option<String>,
        fill: Option<String>,
        stroke_width: f64,
        radius: f64,
    },
    Ellipse {
        cx: f64,
        cy: f64,
        rx: f64,
        ry: f64,
        stroke: Option<String>,
        fill: Option<String>,
        stroke_width: f64,
    },
    Line {
        x1: f64,
        y1: f64,
        x2: f64,
        y2: f64,
        stroke: String,
        stroke_width: f64,
    },
    Text {
        x: f64,
        y: f64,
        text: String,
        font_family: String,
        font_size: f64,
        fill: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LayerType {
    Raster,
    Vector,
    Text,
    Adjustment,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    pub id: String,
    pub name: String,
    pub visible: bool,
    pub locked: bool,
    pub opacity: f32,
    pub blend_mode: String,
    pub layer_type: LayerType,
    pub transform: Transform,
    pub elements: Vec<VectorElement>,
    pub image_data: Option<String>,
}

impl Layer {
    pub fn new_vector(id: String, name: String) -> Self {
        Self {
            id,
            name,
            visible: true,
            locked: false,
            opacity: 1.0,
            blend_mode: "source-over".to_string(),
            layer_type: LayerType::Vector,
            transform: Transform::default(),
            elements: Vec::new(),
            image_data: None,
        }
    }

    pub fn new_image(id: String, name: String, image_data: String) -> Self {
        Self {
            id,
            name,
            visible: true,
            locked: false,
            opacity: 1.0,
            blend_mode: "source-over".to_string(),
            layer_type: LayerType::Raster,
            transform: Transform::default(),
            elements: Vec::new(),
            image_data: Some(image_data),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtCraftProject {
    pub version: u32,
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub dpi: f64,
    pub background_color: String,
    pub layers: Vec<Layer>,
    pub active_layer_id: Option<String>,
}

impl ArtCraftProject {
    pub fn new_default(name: &str, width: u32, height: u32) -> Self {
        let base_layer = Layer::new_vector("layer_1".to_string(), "Calque 1".to_string());
        Self {
            version: 1,
            id: format!("craft_{}", js_sys::Date::now() as u64),
            name: name.to_string(),
            width,
            height,
            dpi: 72.0,
            background_color: "#ffffff".to_string(),
            layers: vec![base_layer],
            active_layer_id: Some("layer_1".to_string()),
        }
    }

    pub fn to_binary(&self) -> Result<Vec<u8>, String> {
        let json_bytes = serde_json::to_vec(self).map_err(|e| e.to_string())?;
        let mut buffer = Vec::with_capacity(CRAFT_MAGIC.len() + 4 + json_bytes.len());
        buffer.extend_from_slice(CRAFT_MAGIC);
        let len = json_bytes.len() as u32;
        buffer.extend_from_slice(&len.to_le_bytes());
        buffer.extend_from_slice(&json_bytes);
        Ok(buffer)
    }

    pub fn from_binary(bytes: &[u8]) -> Result<Self, String> {
        if bytes.starts_with(CRAFT_MAGIC) {
            if bytes.len() < CRAFT_MAGIC.len() + 4 {
                return Err("Format binaire de projet incomplet".to_string());
            }
            let offset = CRAFT_MAGIC.len() + 4;
            let payload = &bytes[offset..];
            serde_json::from_slice(payload).map_err(|e| format!("Erreur JSON: {}", e))
        } else if let Ok(project) = serde_json::from_slice::<ArtCraftProject>(bytes) {
            // Supporte aussi le JSON brut
            Ok(project)
        } else {
            Err("Fichier ArtCraft (.craft / .art) non reconnu".to_string())
        }
    }
}
