import convert = require('convert-units');

const metric = /([0-9]+)\s*(ml|l|kg|g)*\s+(.*)/;
const imperial = /([0-9]+)\s*(lb|oz|floz|pint|gallon|cup)*\s+(.*)/;
const universal = /([0-9]+)\s*(tsp|tbsp|pinch|pinches|drop)/;

const measurementSystems = [metric, imperial, universal];

const metricUnits = ["g", "kg", "ml", "l"];
const imperialUnits = ["lb", "oz", "floz", "cup", "pint", "gallon"];

const massUnits = ["lb", "oz", "g", "kg"];
const volumeUnits = ["cup", "cups", "floz", "l", "ml"];

const smallUnits = ["ml", "g", "oz", "floz"];
const largeUnits = ["lb", "kg", "pint", "gallon"];

const unitType = (unit: string) => {
    if (massUnits.indexOf(unit) != -1) {
        return "mass";
    } else if (volumeUnits.indexOf(unit) != -1) {
        return "volume"
    }
    return "other";
}

const sourceSystemFromUnit = (unit: string) => {
    if (metricUnits.indexOf(unit) != -1) {
        return "metric";
    } else if (imperialUnits.indexOf(unit) != -1) {
        return "imperial"
    }
    return "universal";
}

const targetUnitFromSource = (targetSystem: string, sourceUnit: string) => {

  const sourceSystem = sourceSystemFromUnit(sourceUnit);
  if (sourceSystem === targetSystem) {
      return sourceUnit;
  }

  const _unitType = unitType(sourceUnit);
  switch (sourceSystem) {

      case "imperial": {
          if (_unitType === "mass")
              return "kg";
          else if (_unitType === "volume")
              return "l";
      }

      case "metric": {
          if (_unitType === "mass")
            return "lb";
          else if (_unitType === "volume")
            return "floz";
      }
  }

  return sourceUnit;
}

const standardiseUnit = (unit: string) => {
    const _unit = unit.replace(/ /g, '');
    if (_unit === "floz")
       return "fl-oz";
    return _unit;
}

export const convertIngredient = (ingredient: string, targetSystem: string) => {

    let result = ingredient;
    measurementSystems.some(s => {
        let match: RegExpExecArray;
        if (match = s.exec(ingredient)) {
            const amount = match[1];
            const units = standardiseUnit(match[2]);
            const targetUnits = targetUnitFromSource(targetSystem, units);

            const conversion = convert(
                convert(amount).from(units).to(targetUnits) // system conversion
            ).from(targetUnits).toBest(); // scale conversion (e.g. kg to g, 1/2 lb to 8oz)

            if (conversion.val > 1 && smallUnits.indexOf(conversion.unit) != -1) {
                result = `${Math.round(conversion.val)}${conversion.unit} ${match[3]}`;
            } else {
                result = `${conversion.val.toFixed(2)}${conversion.unit} ${match[3]}`;
            }
            return true; // break 
        }
    });
    return result;
}
