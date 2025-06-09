
'use server';
/**
 * @fileOverview Un flujo de Genkit para proporcionar explicaciones sobre FerreTrack.
 *
 * - getAppGuideExplanation - Función que obtiene una explicación para un tema dado.
 * - AppGuideInput - El tipo de entrada para la función.
 * - AppGuideOutput - El tipo de retorno de la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AppGuideInputSchema = z.object({
  topic: z.string().describe("El tema sobre el cual el usuario desea una explicación. Ejemplos: 'Dashboard', 'Inventory', 'Creating a Sale', 'Customers Page', 'add_inventory', 'update_stock', 'sales', 'create_sale', 'suppliers'"),
});
export type AppGuideInput = z.infer<typeof AppGuideInputSchema>;

const AppGuideOutputSchema = z.object({
  explanation: z.string().describe("Una explicación clara y concisa del tema solicitado, adaptada para un nuevo usuario de la aplicación FerreTrack."),
});
export type AppGuideOutput = z.infer<typeof AppGuideOutputSchema>;

export async function getAppGuideExplanation(input: AppGuideInput): Promise<AppGuideOutput> {
  return appGuideFlow(input);
}

const prompt = ai.definePrompt({
  name: 'appGuidePrompt',
  input: { schema: AppGuideInputSchema },
  output: { schema: AppGuideOutputSchema },
  prompt: `Eres FerreHelper, un asistente IA amigable y experto en la aplicación FerreTrack, una herramienta de gestión de inventario y ventas para ferreterías.
Tu tarea es explicar de manera sencilla diferentes partes y funcionalidades de FerreTrack a un nuevo usuario.

El usuario quiere aprender sobre: "{{topic}}"

Considera los siguientes temas clave y su funcionalidad en FerreTrack para dar tu explicación:
- Dashboard: Página principal de bienvenida, accesos directos a las secciones principales.
- Inventory / Inventario: Gestión de productos (artículos). Ver lista, añadir nuevos artículos (con código único CC-SS-NNNNN), editar detalles (nombre, precio, stock mínimo, unidad de medida), eliminar artículos.
- Add Inventory / Añadir Inventario: Formulario para crear un nuevo artículo en el inventario, definiendo su nombre, categoría, código de estante, unidad de medida, precio, stock inicial, stock mínimo y ventas diarias promedio.
- Update Stock / Registrar Entrada de Stock: Funcionalidad para incrementar la cantidad de un artículo existente usando su código.
- Sales / Ventas: Historial de todas las ventas realizadas. Se puede ver detalle de cada venta (factura).
- Create Sale / Registrar Venta: Formulario para crear una nueva venta. Se seleccionan artículos del inventario, se especifica cantidad, se elige cliente (opcional) y método de pago. Las ventas son transaccionales (todo o nada) para asegurar consistencia de datos.
- Customers / Clientes: Administración de la base de datos de clientes (nombres, RUC/cédula, contacto). Se pueden añadir, editar y eliminar clientes.
- Suppliers / Proveedores: Gestión de información de proveedores (nombres, contacto, productos que suministran).

Instrucciones para tu respuesta:
1.  Identifica el tema principal basado en la entrada "{{topic}}".
2.  Proporciona una explicación clara, concisa (2-4 párrafos idealmente) y útil para un principiante.
3.  Enfócate en el propósito principal de esa sección/funcionalidad.
4.  Menciona las acciones clave que el usuario puede realizar.
5.  Si es relevante, ofrece algún consejo práctico o resalta algún aspecto importante (ej: códigos de inventario, transacciones en ventas).
6.  Usa un tono amigable y directo.
7.  No incluyas saludos como "¡Hola!" o despedidas. Simplemente proporciona la explicación.
8.  Formatea la respuesta en párrafos separados por saltos de línea (\n) para mejor legibilidad.
9.  Si el topic es algo como 'add_inventory', enfócate en la acción específica. Si es 'inventory', da una visión general de la sección.
    Ejemplo para topic 'dashboard': "El Dashboard es tu página de inicio en FerreTrack. Desde aquí, puedes ver un resumen general y acceder rápidamente a las secciones más importantes como Inventario, Ventas y Clientes usando los botones de navegación."
    Ejemplo para topic 'add_inventory': "Añadir un artículo al inventario te permite registrar nuevos productos en FerreTrack. Deberás proporcionar detalles como el nombre del producto, su categoría (usando un código), un código de estante, la unidad en que se mide o cuenta (ej: 'pieza', 'litro', 'caja'), su precio de venta por esa unidad, la cantidad inicial que tienes en stock, el stock mínimo deseado y un estimado de ventas diarias. Esto ayuda a FerreTrack a generar un código único para el producto y a rastrear sus niveles."

Por favor, genera la explicación.
`,
});

const appGuideFlow = ai.defineFlow(
  {
    name: 'appGuideFlow',
    inputSchema: AppGuideInputSchema,
    outputSchema: AppGuideOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("La IA no pudo generar una explicación.");
    }
    return output;
  }
);
