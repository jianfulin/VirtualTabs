/**
 * zodToJsonSchema — converts a Zod shape object into an MCP inputSchema.
 *
 * Lightweight implementation supporting Zod v4 (uses ._def.typeName string
 * for type identification). Only covers types commonly used in MCP tool
 * inputSchema definitions.
 */
import { z } from 'zod';

type ZodShape = Record<string, z.ZodTypeAny>;

/**
 * Extract the typeName from a Zod type.
 * Zod v4 stores it under ._def (or .def) as typeName.
 */
function getTypeName(zodType: z.ZodTypeAny): string {
  // Zod v4: zodType.def?.typeName or zodType._def?.typeName
  const def = (zodType as any)._def ?? (zodType as any).def;
  return def?.typeName ?? '';
}

/**
 * Convert a single ZodType to a JSON Schema object.
 */
function convertZodType(zodType: z.ZodTypeAny): Record<string, unknown> {
  const typeName = getTypeName(zodType);
  const def = (zodType as any)._def ?? (zodType as any).def;
  const description = (zodType as any).description ?? def?.description;

  switch (typeName) {
    case 'ZodOptional':
      return convertZodType(def.innerType);

    case 'ZodDefault':
      return convertZodType(def.innerType);

    case 'ZodString':
      return { type: 'string', ...(description && { description }) };

    case 'ZodNumber':
      return { type: 'number', ...(description && { description }) };

    case 'ZodBoolean':
      return { type: 'boolean', ...(description && { description }) };

    case 'ZodEnum': {
      // Zod v3: def.values (array), Zod v4: def.entries (object) or def.values
      let values: string[];
      if (Array.isArray(def.values)) {
        values = def.values;
      } else if (def.entries) {
        values = Object.values(def.entries) as string[];
      } else {
        values = [];
      }
      return { type: 'string', enum: values, ...(description && { description }) };
    }

    case 'ZodArray': {
      const items = convertZodType(def.type ?? def.element);
      return { type: 'array', items, ...(description && { description }) };
    }

    case 'ZodObject': {
      const shape: ZodShape = typeof def.shape === 'function' ? def.shape() : def.shape;
      return zodToJsonSchema(shape);
    }

    case 'ZodUnion': {
      // Zod union: def.options is an array of ZodType alternatives
      const options = def.options as z.ZodTypeAny[] | undefined;
      if (options && options.length > 0) {
        return { anyOf: options.map(convertZodType), ...(description && { description }) };
      }
      return { type: 'string', ...(description && { description }) };
    }

    default:
      // fallback — log a warning so schema gaps are discoverable
      if (typeof console !== 'undefined') {
        console.warn(`[zodToJsonSchema] Unhandled Zod type "${typeName}", falling back to { type: 'string' }`);
      }
      return { type: 'string', ...(description && { description }) };
  }
}

function isOptionalType(zodType: z.ZodTypeAny): boolean {
  const typeName = getTypeName(zodType);
  return typeName === 'ZodOptional' || typeName === 'ZodDefault';
}

/**
 * Convert a Zod shape (Record<string, ZodTypeAny>) to an MCP inputSchema.
 */
export function zodToJsonSchema(shape: ZodShape): Record<string, unknown> {
  if (!shape || Object.keys(shape).length === 0) {
    return { type: 'object', properties: {} };
  }

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, zodType] of Object.entries(shape)) {
    properties[key] = convertZodType(zodType);
    if (!isOptionalType(zodType)) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 && { required }),
  };
}
