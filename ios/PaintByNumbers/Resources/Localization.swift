import Foundation
import PaintEngine

/// Symbol for palette index: 1..9, then 0, then A..Z (36 total).
public func symbolFor(_ index: Int) -> String {
    if index < 9 { return String(index + 1) }
    if index == 9 { return "0" }
    let letterIndex = index - 10
    guard letterIndex < 26 else { return "?" }
    return String(Character(UnicodeScalar(65 + letterIndex)!))
}

/// Reverse mapping for legend lookup.
public func colorIndexForSymbol(_ symbol: String) -> Int? {
    if symbol == "0" { return 9 }
    if let d = symbol.first, d.isNumber, d != "0" { return Int(String(d))! - 1 }
    if let c = symbol.first, let scalar = c.unicodeScalars.first, scalar.value >= 65, scalar.value <= 90 {
        return 10 + Int(scalar.value - 65)
    }
    return nil
}
