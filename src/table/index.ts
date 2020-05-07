import { Schema } from "./schema";
import { Rule, Tree, SchematicsException, url, apply, move, mergeWith, applyTemplates, chain } from "@angular-devkit/schematics";
import { strings } from "@angular-devkit/core";
import { getProject, buildDefaultPath } from "@schematics/angular/utility/project";
import { parseName } from "@schematics/angular/utility/parse-name";
import { addDeclarationToModule } from "@schematics/angular/utility/ast-utils";
import * as ts from "typescript";
import { buildRelativePath, findModuleFromOptions } from "@schematics/angular/utility/find-module";
import { InsertChange } from '@schematics/angular/utility/change';
import { validateName } from '@schematics/angular/utility/validation';

function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
  const text = host.read(modulePath);
  if (text === null) {
    throw new SchematicsException(`File ${modulePath} does not exist.`);
  }
  const sourceText = text.toString('utf-8');

  return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}

function addDeclarationToNgModule(_options: Schema): Rule {
  return (host: Tree) => {
    const modulePath = _options.module;
    const source = readIntoSourceFile(host, modulePath);

    const componentPath = `/${_options.path}/` + (_options.flat ? '' : strings.dasherize(_options.name) + '/') + strings.dasherize(_options.name) + '.Component';
    const relativePath = buildRelativePath(modulePath, componentPath);
    const classifiedName = strings.classify(_options.name) + strings.classify('Component');
    const declarationChanges = addDeclarationToModule(source, modulePath, classifiedName, relativePath);

    const declarationRecorder = host.beginUpdate(modulePath);
    for (const change of declarationChanges) {
      if (change instanceof InsertChange) {
        declarationRecorder.insertLeft(change.pos, change.toAdd);
      }
    }
    host.commitUpdate(declarationRecorder);

    return host;
  };
}

export function table(_options: Schema): Rule {
  return (host: Tree) => {
    const project = getProject(host, _options.project);
    if (_options.path === undefined && project) {
      _options.path = buildDefaultPath(project);
    }
    _options.module = findModuleFromOptions(host, _options);

    const parsedPath = parseName(_options.path as string, _options.name);
    _options.name = parsedPath.name;
    _options.path = parsedPath.path;
    validateName(_options.name);

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        'if-flat': (s: string) => _options.flat ? '' : s,
        ..._options
      }),
      move(parsedPath.path)
    ]);

    return chain([
      addDeclarationToNgModule(_options),
      mergeWith(templateSource)
    ]);
  };
}