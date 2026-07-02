# Manuales y Capacitaciones del Sistema

Este directorio contiene los manuales y capacitaciones del Sistema de Gestión de Condominios (Asesorías Integrales CyJ - Condominio Laguna Norte).

## 📁 Archivos disponibles

### Manual de Usuario
- **`Manual_Usuario_Sistema_CYJ.docx`** — Manual completo (~40 páginas) en formato Word.
  - Generado con: `python3 /home/z/my-project/scripts/generate_manual.py`
  - Última actualización: Junio 2026 (v1.0)

### Capacitaciones por Rol (PowerPoint)
Cada archivo es una capacitación específica para un rol:

| Rol | Archivo | Slides |
|---|---|---|
| Administrador | `Capacitacion_Administrador.pptx` | 12 |
| Supervisor | `Capacitacion_Supervisor.pptx` | 11 |
| Usuario | `Capacitacion_Usuario.pptx` | 10 |
| Personal | `Capacitacion_Personal.pptx` | 11 |
| Auditor | `Capacitacion_Auditor.pptx` | 10 |
| Guardia | `Capacitacion_Guardia.pptx` | 11 |

- Generados con: `python3 /home/z/my-project/scripts/generate_capacitaciones.py`

## 🔄 Cómo actualizar los manuales

**IMPORTANTE:** Cada vez que se realice un cambio significativo en el sistema, se deben actualizar los manuales y capacitaciones para que reflejen la realidad actual.

### Cuándo actualizar
- ✅ Se agrega un nuevo módulo
- ✅ Se modifica un flujo de aprobación (OT, SC, etc.)
- ✅ Se cambian permisos de algún rol
- ✅ Se agrega/quita un rol
- ✅ Se cambia la URL del sistema
- ✅ Se modifica la página del guardia
- ✅ Se agrega una nueva funcionalidad importante

### Pasos para actualizar

1. **Editar los scripts generadores:**
   - Manual Word: `/home/z/my-project/scripts/generate_manual.py`
   - Capacitaciones PPT: `/home/z/my-project/scripts/generate_capacitaciones.py`

2. **Actualizar la versión y fecha** en ambos scripts:
   ```python
   MANUAL_VERSION = '1.1'  # subir versión
   MANUAL_FECHA = 'Julio 2026'  # actualizar fecha
   ```

3. **Actualizar el contenido** del manual/capacitaciones según los cambios realizados en el sistema.

4. **Regenerar los archivos:**
   ```bash
   cd /home/z/my-project
   python3 scripts/generate_manual.py
   python3 scripts/generate_capacitaciones.py
   ```

5. **Copiar los archivos actualizados a /public/manuales/:**
   ```bash
   cp /home/z/my-project/download/Manual_Usuario_Sistema_CYJ.docx \
      /home/z/my-project/repos/condominios-cyj/public/manuales/
   cp /home/z/my-project/download/Capacitacion_*.pptx \
      /home/z/my-project/repos/condominios-cyj/public/manuales/
   ```

6. **Actualizar la versión en el componente `ManualesModule.tsx`:**
   - Archivo: `/home/z/my-project/repos/condominios-cyj/src/components/manuales/ManualesModule.tsx`
   - Buscar: `const MANUAL_VERSION = '1.0'` y `const MANUAL_FECHA = 'Junio 2026'`
   - Actualizar con la nueva versión y fecha

7. **Hacer commit y push:**
   ```bash
   cd /home/z/my-project/repos/condominios-cyj
   git add public/manuales/ src/components/manuales/ManualesModule.tsx
   git commit -m "docs: actualizar manuales a vX.X (describir cambios)"
   git push origin main
   ```

8. **Verificar** que los archivos están accesibles:
   - Manual: `https://condominios-cyj.vercel.app/manuales/Manual_Usuario_Sistema_CYJ.docx`
   - Capacitaciones: `https://condominios-cyj.vercel.app/manuales/Capacitacion_<Rol>.pptx`
   - Módulo en sistema: iniciar sesión → Sistema → "Manuales y Capacitaciones"

## 📋 Checklist de actualización

Antes de hacer commit, verifica:

- [ ] Versión incrementada (1.0 → 1.1, etc.)
- [ ] Fecha actualizada
- [ ] Manual Word regenerado y copiado a /public/manuales/
- [ ] 6 capacitaciones PPT regeneradas y copiadas
- [ ] `MANUAL_VERSION` y `MANUAL_FECHA` actualizadas en `ManualesModule.tsx`
- [ ] `MANUAL_VERSION` y `MANUAL_FECHA` actualizadas en `/app/manuales-guardia/page.tsx`
- [ ] Contenido revisado: nuevos módulos, flujos, permisos, roles
- [ ] Matriz de permisos actualizada si hubo cambios
- [ ] FAQ actualizado si hubo nuevas preguntas
- [ ] Commit + push realizado

## 🎨 Diseño

### Manual Word
- Color corporativo primario: `#0A1172` (azul CYJ)
- Color corporativo oscuro: `#0F2040`
- Color de acento: `#F59E0B` (ámbar)
- Fuente: Calibri (cuerpo), Consolas (código/URLs)

### Capacitaciones PPT
- Formato 16:9 (13.333 × 7.5 pulgadas)
- Cada rol tiene su color de acento:
  - Admin: ámbar
  - Supervisor: azul
  - Usuario: verde
  - Personal: ámbar
  - Auditor: gris
  - Guardia: ámbar
- Estructura: Portada → Rol/Responsabilidades → Módulos → Sección → Flujos → Limitaciones → Datos acceso → Cierre

## 📞 Soporte

Si necesitas ayuda con la generación o actualización de manuales, contacta al equipo de desarrollo.

**URL del sistema:** https://condominios-cyj.vercel.app
**Email:** asesoriasintegralescyj@gmail.com
