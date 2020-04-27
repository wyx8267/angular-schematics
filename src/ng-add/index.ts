import { chain, Rule, schematic, SchematicContext, Tree, } from '@angular-devkit/schematics';

export default function (_options: any): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      schematic('table', _options)
    ])(host, context);
  };
}
