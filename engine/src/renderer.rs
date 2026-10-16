use wasm_bindgen::JsValue;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};
use crate::model::{ArtCraftProject, Layer, VectorElement};

pub struct Renderer {
    pub canvas: HtmlCanvasElement,
    pub ctx: CanvasRenderingContext2d,
    pub zoom: f64,
    pub pan_x: f64,
    pub pan_y: f64,
    pub device_pixel_ratio: f64,
}

impl Renderer {
    pub fn new(canvas: HtmlCanvasElement) -> Result<Self, JsValue> {
        let ctx = canvas
            .get_context("2d")?
            .ok_or_else(|| JsValue::from_str("Impossible d'obtenir le contexte 2D"))?
            .dyn_into::<CanvasRenderingContext2d>()?;

        Ok(Self {
            canvas,
            ctx,
            zoom: 1.0,
            pan_x: 0.0,
            pan_y: 0.0,
            device_pixel_ratio: 1.0,
        })
    }

    pub fn resize(&mut self, width: u32, height: u32, dpr: f64) {
        self.device_pixel_ratio = dpr;
        self.canvas.set_width((width as f64 * dpr) as u32);
        self.canvas.set_height((height as f64 * dpr) as u32);
    }

    pub fn render(&self, project: &ArtCraftProject) -> Result<(), JsValue> {
        let dpr = self.device_pixel_ratio;
        let c_width = self.canvas.width() as f64;
        let c_height = self.canvas.height() as f64;

        self.ctx.save();
        self.ctx.scale(dpr, dpr)?;

        // Effacement complet
        self.ctx.clear_rect(0.0, 0.0, c_width / dpr, c_height / dpr);

        // Pan et Zoom
        self.ctx.save();
        self.ctx.translate(self.pan_x, self.pan_y)?;
        self.ctx.scale(self.zoom, self.zoom)?;

        // Fond du document (papier/zone de travail)
        self.ctx.set_fill_style(&JsValue::from_str(&project.background_color));
        self.ctx.fill_rect(0.0, 0.0, project.width as f64, project.height as f64);

        // Bordure d'ombre du document
        self.ctx.set_stroke_style(&JsValue::from_str("rgba(0, 0, 0, 0.15)"));
        self.ctx.set_line_width(1.0);
        self.ctx.stroke_rect(0.0, 0.0, project.width as f64, project.height as f64);

        // Rendu des calques dans l'ordre
        for layer in &project.layers {
            if !layer.visible {
                continue;
            }
            self.render_layer(layer)?;
        }

        self.ctx.restore();
        self.ctx.restore();
        Ok(())
    }

    fn render_layer(&self, layer: &Layer) -> Result<(), JsValue> {
        self.ctx.save();
        self.ctx.set_global_alpha(layer.opacity as f64);
        let _ = self.ctx.set_global_composite_operation(&layer.blend_mode);

        // Application de la transformation du calque
        self.ctx.translate(layer.transform.x, layer.transform.y)?;
        self.ctx.rotate(layer.transform.rotation)?;
        self.ctx.scale(layer.transform.scale_x, layer.transform.scale_y)?;

        // Éléments vectoriels
        for element in &layer.elements {
            match element {
                VectorElement::Path { points, stroke, fill, stroke_width, closed } => {
                    if points.is_empty() {
                        continue;
                    }
                    self.ctx.begin_path();
                    self.ctx.move_to(points[0].x, points[0].y);
                    for pt in points.iter().skip(1) {
                        self.ctx.line_to(pt.x, pt.y);
                    }
                    if *closed {
                        self.ctx.close_path();
                    }
                    if let Some(f) = fill {
                        self.ctx.set_fill_style(&JsValue::from_str(f));
                        self.ctx.fill();
                    }
                    self.ctx.set_stroke_style(&JsValue::from_str(stroke));
                    self.ctx.set_line_width(*stroke_width);
                    self.ctx.set_line_cap("round");
                    self.ctx.set_line_join("round");
                    self.ctx.stroke();
                }
                VectorElement::Rect { x, y, width, height, stroke, fill, stroke_width, radius: _ } => {
                    if let Some(f) = fill {
                        self.ctx.set_fill_style(&JsValue::from_str(f));
                        self.ctx.fill_rect(*x, *y, *width, *height);
                    }
                    if let Some(s) = stroke {
                        self.ctx.set_stroke_style(&JsValue::from_str(s));
                        self.ctx.set_line_width(*stroke_width);
                        self.ctx.stroke_rect(*x, *y, *width, *height);
                    }
                }
                VectorElement::Ellipse { cx, cy, rx, ry, stroke, fill, stroke_width } => {
                    self.ctx.begin_path();
                    let _ = self.ctx.ellipse(*cx, *cy, *rx, *ry, 0.0, 0.0, std::f64::consts::PI * 2.0);
                    if let Some(f) = fill {
                        self.ctx.set_fill_style(&JsValue::from_str(f));
                        self.ctx.fill();
                    }
                    if let Some(s) = stroke {
                        self.ctx.set_stroke_style(&JsValue::from_str(s));
                        self.ctx.set_line_width(*stroke_width);
                        self.ctx.stroke();
                    }
                }
                VectorElement::Line { x1, y1, x2, y2, stroke, stroke_width } => {
                    self.ctx.begin_path();
                    self.ctx.move_to(*x1, *y1);
                    self.ctx.line_to(*x2, *y2);
                    self.ctx.set_stroke_style(&JsValue::from_str(stroke));
                    self.ctx.set_line_width(*stroke_width);
                    self.ctx.stroke();
                }
                VectorElement::Text { x, y, text, font_family, font_size, fill } => {
                    self.ctx.set_font(&format!("{}px {}", font_size, font_family));
                    self.ctx.set_fill_style(&JsValue::from_str(fill));
                    let _ = self.ctx.fill_text(text, *x, *y);
                }
            }
        }

        self.ctx.restore();
        Ok(())
    }
}
