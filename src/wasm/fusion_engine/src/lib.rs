//! OSINT Fusion Engine -- WebAssembly module.
//!
//! Performs high-performance entity correlation and pattern detection.
//! Compiled to WASM via `wasm-pack build --target web`.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// ---------------------------------------------------------------------------
// Data types mirroring the TypeScript Entity model
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct EntityInput {
    pub id: String,
    pub lat: f64,
    pub lon: f64,
    pub alt: Option<f64>,
    pub entity_type: String,
    pub provider: String,
}

#[derive(Serialize)]
pub struct FusionRelation {
    pub entity_a: String,
    pub entity_b: String,
    pub relation_type: String,
    pub confidence: f64,
    pub distance_m: f64,
}

#[derive(Serialize)]
pub struct FusionOutput {
    pub relations: Vec<FusionRelation>,
    pub entity_count: usize,
}

// ---------------------------------------------------------------------------
// Haversine distance (metres)
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M: f64 = 6_371_000.0;

fn haversine_m(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let a = (d_lat / 2.0).sin().powi(2)
        + lat1.to_radians().cos() * lat2.to_radians().cos() * (d_lon / 2.0).sin().powi(2);
    EARTH_RADIUS_M * 2.0 * a.sqrt().atan2((1.0 - a).sqrt())
}

// ---------------------------------------------------------------------------
// Exported fusion function
// ---------------------------------------------------------------------------

/// Perform proximity-based entity fusion.
///
/// Accepts a JS array of entity objects and returns a JS object containing
/// detected relations.
#[wasm_bindgen]
pub fn fuse_entities(input: JsValue) -> Result<JsValue, JsValue> {
    let entities: Vec<EntityInput> =
        serde_wasm_bindgen::from_value(input).map_err(|e| JsValue::from_str(&e.to_string()))?;

    let proximity_threshold_m = 500.0;
    let min_confidence = 0.3;
    let mut relations: Vec<FusionRelation> = Vec::new();

    for i in 0..entities.len() {
        for j in (i + 1)..entities.len() {
            let a = &entities[i];
            let b = &entities[j];

            // Only correlate across different providers or entity types
            if a.provider == b.provider && a.entity_type == b.entity_type {
                continue;
            }

            let dist = haversine_m(a.lat, a.lon, b.lat, b.lon);
            if dist <= proximity_threshold_m {
                let confidence = 1.0 - (dist / proximity_threshold_m);
                if confidence >= min_confidence {
                    relations.push(FusionRelation {
                        entity_a: a.id.clone(),
                        entity_b: b.id.clone(),
                        relation_type: "proximity".to_string(),
                        confidence,
                        distance_m: dist,
                    });
                }
            }
        }
    }

    let output = FusionOutput {
        entity_count: entities.len(),
        relations,
    };

    serde_wasm_bindgen::to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn haversine_same_point_is_zero() {
        let d = haversine_m(51.5074, -0.1278, 51.5074, -0.1278);
        assert!(d.abs() < 0.01);
    }

    #[test]
    fn haversine_known_distance() {
        // London to Paris ~ 343 km
        let d = haversine_m(51.5074, -0.1278, 48.8566, 2.3522);
        assert!((d - 343_560.0).abs() < 5_000.0);
    }
}
