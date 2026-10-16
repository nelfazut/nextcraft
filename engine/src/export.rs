use wasm_bindgen::JsValue;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};
use crate::model::{ArtCraftProject, VectorElement};

pub fn project_to_svg(project: &ArtCraftProject) -> String {
    let mut svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{}" height="{}" viewBox="0 0 {} {}">"#,
        project.width, project.height, project.width, project.height
    );
    svg.push('\n');
    svg.push_str(&format!(
        r#"  <rect width="100%" height="100%" fill="{}"/>"#,
        project.background_color
    ));
    svg.push('\n');

    for layer in &project.layers {
        if !layer.visible {
            continue;
        }
        svg.push_str(&format!(
            r#"  <g id="{}" opacity="{}" transform="translate({}, {}) rotate({}) scale({}, {})">"#,
            layer.id, layer.opacity, layer.transform.x, layer.transform.y, layer.transform.rotation, layer.transform.scale_x, layer.transform.scale_y
        ));
        svg.push('\n');

        for element in &layer.elements {
            match element {
                VectorElement::Path { points, stroke, fill, stroke_width, closed } => {
                    if points.is_empty() {
                        continue;
                    }
                    let mut d = format!("M {} {}", points[0].x, points[0].y);
                    for pt in points.iter().skip(1) {
                        d.push_str(&format!(" L {} {}", pt.x, pt.y));
                    }
                    if *closed {
                        d.push_str(" Z");
                    }
                    let fill_attr = fill.as_deref().unwrap_or("none");
                    svg.push_str(&format!(
                        r#"    <path d="{}" stroke="{}" stroke-width="{}" fill="{}" stroke-linecap="round" stroke-linejoin="round"/>"#,
                        d, stroke, stroke_width, fill_attr
                    ));
                    svg.push('\n');
                }
                VectorElement::Rect { x, y, width, height, stroke, fill, stroke_width, radius: _ } => {
                    let stroke_attr = stroke.as_deref().unwrap_or("none");
                    let fill_attr = fill.as_deref().unwrap_or("none");
                    svg.push_str(&format!(
                        r#"    <rect x="{}" y="{}" width="{}" height="{}" stroke="{}" stroke-width="{}" fill="{}"/>"#,
                        x, y, width, height, stroke_attr, stroke_width, fill_attr
                    ));
                    svg.push('\n');
                }
                VectorElement::Ellipse { cx, cy, rx, ry, stroke, fill, stroke_width } => {
                    let stroke_attr = stroke.as_deref().unwrap_or("none");
                    let fill_attr = fill.as_deref().unwrap_or("none");
                    svg.push_str(&format!(
                        r#"    <ellipse cx="{}" cy="{}" rx="{}" ry="{}" stroke="{}" stroke-width="{}" fill="{}"/>"#,
                        cx, cy, rx, ry, stroke_attr, stroke_width, fill_attr
                    ));
                    svg.push('\n');
                }
                VectorElement::Line { x1, y1, x2, y2, stroke, stroke_width } => {
                    svg.push_str(&format!(
                        r#"    <line x1="{}" y1="{}" x2="{}" y2="{}" stroke="{}" stroke-width="{}"/>"#,
                        x1, y1, x2, y2, stroke, stroke_width
                    ));
                    svg.push('\n');
                }
                VectorElement::Text { x, y, text, font_family, font_size, fill } => {
                    svg.push_str(&format!(
                        r#"    <text x="{}" y="{}" font-family="{}" font-size="{}" fill="{}">{}</text>"#,
                        x, y, font_family, font_size, fill, text
                    ));
                    svg.push('\n');
                }
            }
        }
        svg.push_str("  </g>\n");
    }

    svg.push_str("</svg>");
    svg
}

pub fn render_to_offscreen(project: &ArtCraftProject) -> Result<HtmlCanvasElement, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("Pas d'objet window"))?;
    let document = window.document().ok_or_else(|| JsValue::from_str("Pas d'objet document"))?;
    let offscreen = document.create_element("canvas")?.dyn_into::<HtmlCanvasElement>()?;
    offscreen.set_width(project.width);
    offscreen.set_height(project.height);

    let ctx = offscreen
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("Pas de contexte 2D offscreen"))?
        .dyn_into::<CanvasRenderingContext2d>()?;

    ctx.set_fill_style(&JsValue::from_str(&project.background_color));
    ctx.fill_rect(0.0, 0.0, project.width as f64, project.height as f64);

    Ok(offscreen)
}
