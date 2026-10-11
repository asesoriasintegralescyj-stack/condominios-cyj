#!/usr/bin/env python3
"""
Script de prueba para todas las automatizaciones del sistema CyJ.
Envía correos de prueba usando las mismas plantillas HTML que usa la app en producción.

Uso:
  python scripts/test_automatizaciones.py

Requiere: pip install nodemailer-compatible (usa smtplib de stdlib)
"""

import smtplib
import ssl
import json
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timedelta

# ─── CONFIGURACIÓN SMTP ───
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "asesoriasintegralescyj@gmail.com"
SMTP_PASS = "hjvzsozyixbpuziy"  # App password sin espacios

# Destinatarios de prueba (los mismos que usa producción)
EMAIL_TO = "operaciones.lagunanorte@gmail.com"
EMAIL_CC = "administracionlagunanorte@gmail.com"
EMAIL_FROM = SMTP_USER

# Colores corporativos
COLOR_PRIMARY = "#0f2040"
COLOR_ACCENT = "#2E5BBA"
COLOR_WHITE = "#FFFFFF"
COLOR_BG_LIGHT = "#f8fafc"
COLOR_BORDER = "#e2e8f0"


def escape_html(text):
    return (str(text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;"))


def enviar_correo(subject, html_body, to=EMAIL_TO, cc=EMAIL_CC, attachments=None):
    """Envía un correo via Gmail SMTP."""
    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"] = f'"Sistema Condominios CyJ" <{EMAIL_FROM}>'
    msg["To"] = to
    if cc:
        msg["Cc"] = cc

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt)

    if attachments:
        for att in attachments:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(att["content"])
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{att["filename"]}"')
            msg.attach(part)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            recipients = [to]
            if cc:
                recipients.append(cc)
            server.sendmail(EMAIL_FROM, recipients, msg.as_string())
        return True, "OK"
    except Exception as e:
        return False, str(e)


def email_header(title, subtitle=""):
    return f"""
    <div style="background:{COLOR_PRIMARY};color:#fff;padding:20px;border-radius:8px 8px 0 0;">
      <h1 style="margin:0;font-size:20px;">{escape_html(title)}</h1>
      {f'<p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">{escape_html(subtitle)}</p>' if subtitle else ''}
    </div>"""


def email_footer():
    now = datetime.now()
    fecha = now.strftime("%d-%m-%Y %H:%M")
    return f"""
    <div style="padding:16px 20px;background:#f1f5f9;border-radius:0 0 8px 8px;font-size:11px;color:#64748b;">
      Reporte generado automáticamente el {fecha} · Asesorías Integrales CyJ · Administración Condominio Laguna Norte
    </div>"""


def email_wrap(title, subtitle, body_html):
    return f"""
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:800px;margin:0 auto;">
      {email_header(title, subtitle)}
      <div style="border:1px solid {COLOR_BORDER};border-top:none;padding:20px;">
        {body_html}
      </div>
      {email_footer()}
    </div>"""


# ═══════════════════════════════════════════════════════
# TEST 1: ALERTA RONDAS NOCHE
# ═══════════════════════════════════════════════════════
def test_alerta_ronda_noche():
    """Prueba la alerta de rondas turno noche con datos simulados."""
    print("\n🌙 [1/5] Probando Alerta Rondas Noche...")

    # Datos simulados
    guardias = [
        {
            "nombre": "Juan Pérez",
            "sectores": {
                "GAVIOTAS": [("GAVIOTAS - ENTRADA A", "GV-001", "22:15:03", True, "Todo normal"),
                              ("GAVIOTAS - ESTACIONAMIENTO", "GV-002", "23:45:12", True, "")],
                "ALBATROS": [("ALBATROS - PORTÓN", "AL-001", "01:30:22", True, "Revisado"),
                              ("ALBATROS - PASILLO B", "AL-003", "02:15:44", False, "")],
            }
        },
        {
            "nombre": "Carlos Rojas",
            "sectores": {
                "PORTERÍA": [("PORTERÍA PRINCIPAL", "PT-001", "19:05:33", True, "Inicio turno"),
                              ("PORTERÍA PRINCIPAL", "PT-001", "03:00:11", True, "Control ruta")],
                "FAISANES": [("FAISANES - ACCESO", "FA-001", "21:30:55", True, ""),
                              ("FAISANES - PLAZA", "FA-002", "00:45:08", True, "")],
                "BANDURRIAS": [("BANDURRIAS - PORTÓN", "BN-001", "04:20:30", True, "Última ronda")],
            }
        }
    ]

    hoy = datetime.now().strftime("%A %d-%m-%Y")

    # Resumen ejecutivo
    total_marcaciones = sum(
        len(sc) for g in guardias for sc in g["sectores"].values()
    )
    sectores_all = set()
    for g in guardias:
        sectores_all.update(g["sectores"].keys())
    ubicaciones_all = set()
    for g in guardias:
        for scs in g["sectores"].values():
            for s in scs:
                ubicaciones_all.add(s[1])

    resumen_html = f"""
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:14px;">
        <div><strong>Total marcaciones:</strong> {total_marcaciones}</div>
        <div><strong>Guardias:</strong> {len(guardias)}</div>
        <div><strong>Ubicaciones:</strong> {len(ubicaciones_all)}</div>
        <div><strong>Sectores:</strong> {len(sectores_all)}</div>
      </div>
    </div>"""

    # Tabla por sector
    sector_counts = {}
    for g in guardias:
        for sec_name, scs in g["sectores"].items():
            sector_counts[sec_name] = sector_counts.get(sec_name, 0) + len(scs)

    sector_table = f"""
    <h2 style="font-size:15px;color:#0f2040;margin:20px 0 10px;">📊 Resumen por Sector</h2>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:20px;">
      <thead><tr style="background-color:{COLOR_PRIMARY};color:#fff;">
        <th style="padding:8px 12px;text-align:left;">Sector</th>
        <th style="padding:8px 12px;text-align:center;">Marcaciones</th>
      </tr></thead><tbody>
    {''.join(f'<tr style="background-color:#fff;"><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600;">{escape_html(s)}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;">{c}</td></tr>' for s, c in sorted(sector_counts.items(), key=lambda x: -x[1]))}
    </tbody></table>"""

    # Detalle por guardia
    guardias_html = '<h2 style="font-size:15px;color:#0f2040;margin:20px 0 10px;">👤 Detalle por Guardia</h2>'
    shift_color = "#3b82f6"  # noche

    for g in guardias:
        total_g = sum(len(scs) for scs in g["sectores"].values())
        rows = ""
        i = 0
        for sec_name, scs in g["sectores"].items():
            for (loc_name, loc_code, hora, gps, notas) in scs:
                bg = "#fff" if i % 2 == 0 else "#fafafa"
                rows += f"""
                <tr style="background-color:{bg};">
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-weight:600;color:{shift_color};">{escape_html(sec_name)}</td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;">{escape_html(loc_name)}<br/><span style="font-size:10px;color:#94a3b8;">{escape_html(loc_code)}</span></td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;">{hora}</td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">{'✅' if gps else '—'}</td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;color:#64748b;">{escape_html(notas) if notas else '—'}</td>
                </tr>"""
                i += 1

        guardias_html += f"""
        <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;overflow:hidden;">
          <div style="background:{shift_color}20;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:14px;color:#0f2040;">{escape_html(g['nombre'])}</strong>
            <span style="font-size:12px;color:#64748b;">{total_g} marcaciones</span>
          </div>
          <table style="border-collapse:collapse;width:100%;font-size:12px;">
            <thead><tr style="background:#f8fafc;">
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Sector</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Ubicación</th>
              <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">Hora</th>
              <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">GPS</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Notas</th>
            </tr></thead><tbody>{rows}</tbody>
          </table>
        </div>"""

    html = email_wrap(
        "🌙 Reporte de Rondas QR — Turno Noche",
        f"Turno Noche 19:00–07:00 · {hoy}",
        resumen_html + sector_table + guardias_html
    )

    ok, err = enviar_correo(
        f"🔍 Reporte Rondas — Turno Noche · {hoy} · {total_marcaciones} marcaciones [PRUEBA]",
        html
    )
    if ok:
        print(f"  ✅ Alerta Rondas Noche enviada OK ({total_marcaciones} marcaciones, {len(guardias)} guardias)")
    else:
        print(f"  ❌ Error: {err}")
    return ok


# ═══════════════════════════════════════════════════════
# TEST 2: ALERTA RONDAS DÍA
# ═══════════════════════════════════════════════════════
def test_alerta_ronda_dia():
    """Prueba la alerta de rondas turno día con datos simulados."""
    print("\n☀️ [2/5] Probando Alerta Rondas Día...")

    guardias = [
        {
            "nombre": "Pedro Soto",
            "sectores": {
                "PORTERÍA": [("PORTERÍA PRINCIPAL", "PT-001", "07:05:22", True, "Inicio turno")],
                "GAVIOTAS": [("GAVIOTAS - ENTRADA A", "GV-001", "09:30:15", True, ""),
                              ("GAVIOTAS - ESTACIONAMIENTO", "GV-002", "10:15:44", True, "Revisado")],
                "GARZAS": [("GARZAS - ACCESO NORTE", "GZ-001", "11:00:33", True, ""),
                              ("GARZAS - PLAZA CENTRAL", "GZ-002", "12:30:55", True, "")],
            }
        },
        {
            "nombre": "María Lagos",
            "sectores": {
                "ALBATROS": [("ALBATROS - PORTÓN", "AL-001", "08:00:11", True, "Apertura"),
                              ("ALBATROS - PASILLO B", "AL-003", "13:45:22", True, "")],
                "FLAMENCOS": [("FLAMENCOS - ENTRADA", "FL-001", "14:20:30", True, ""),
                              ("FLAMENCOS - CLUB HOUSE", "FL-002", "15:00:44", True, "")],
                "BECACINAS": [("BECACINAS - PORTÓN", "BC-001", "16:30:15", True, "Ronda tarde"),
                              ("BECACINAS - PLAZA", "BC-002", "17:45:00", True, "")],
            }
        }
    ]

    hoy = datetime.now().strftime("%A %d-%m-%Y")
    total_marcaciones = sum(len(sc) for g in guardias for sc in g["sectores"].values())
    sectores_all = set()
    for g in guardias:
        sectores_all.update(g["sectores"].keys())
    ubicaciones_all = set()
    for g in guardias:
        for scs in g["sectores"].values():
            for s in scs:
                ubicaciones_all.add(s[1])

    resumen_html = f"""
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:14px;">
        <div><strong>Total marcaciones:</strong> {total_marcaciones}</div>
        <div><strong>Guardias:</strong> {len(guardias)}</div>
        <div><strong>Ubicaciones:</strong> {len(ubicaciones_all)}</div>
        <div><strong>Sectores:</strong> {len(sectores_all)}</div>
      </div>
    </div>"""

    sector_counts = {}
    for g in guardias:
        for sec_name, scs in g["sectores"].items():
            sector_counts[sec_name] = sector_counts.get(sec_name, 0) + len(scs)

    sector_table = f"""
    <h2 style="font-size:15px;color:#0f2040;margin:20px 0 10px;">📊 Resumen por Sector</h2>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:20px;">
      <thead><tr style="background-color:{COLOR_PRIMARY};color:#fff;">
        <th style="padding:8px 12px;text-align:left;">Sector</th>
        <th style="padding:8px 12px;text-align:center;">Marcaciones</th>
      </tr></thead><tbody>
    {''.join(f'<tr style="background-color:#fff;"><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600;">{escape_html(s)}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;">{c}</td></tr>' for s, c in sorted(sector_counts.items(), key=lambda x: -x[1]))}
    </tbody></table>"""

    guardias_html = '<h2 style="font-size:15px;color:#0f2040;margin:20px 0 10px;">👤 Detalle por Guardia</h2>'
    shift_color = "#f59e0b"  # día

    for g in guardias:
        total_g = sum(len(scs) for scs in g["sectores"].values())
        rows = ""
        i = 0
        for sec_name, scs in g["sectores"].items():
            for (loc_name, loc_code, hora, gps, notas) in scs:
                bg = "#fff" if i % 2 == 0 else "#fafafa"
                rows += f"""
                <tr style="background-color:{bg};">
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-weight:600;color:{shift_color};">{escape_html(sec_name)}</td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;">{escape_html(loc_name)}<br/><span style="font-size:10px;color:#94a3b8;">{escape_html(loc_code)}</span></td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;">{hora}</td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">{'✅' if gps else '—'}</td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;color:#64748b;">{escape_html(notas) if notas else '—'}</td>
                </tr>"""
                i += 1

        guardias_html += f"""
        <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;overflow:hidden;">
          <div style="background:{shift_color}20;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:14px;color:#0f2040;">{escape_html(g['nombre'])}</strong>
            <span style="font-size:12px;color:#64748b;">{total_g} marcaciones</span>
          </div>
          <table style="border-collapse:collapse;width:100%;font-size:12px;">
            <thead><tr style="background:#f8fafc;">
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Sector</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Ubicación</th>
              <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">Hora</th>
              <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">GPS</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Notas</th>
            </tr></thead><tbody>{rows}</tbody>
          </table>
        </div>"""

    html = email_wrap(
        "☀️ Reporte de Rondas QR — Turno Día",
        f"Turno Día 07:00–19:00 · {hoy}",
        resumen_html + sector_table + guardias_html
    )

    ok, err = enviar_correo(
        f"🔍 Reporte Rondas — Turno Día · {hoy} · {total_marcaciones} marcaciones [PRUEBA]",
        html
    )
    if ok:
        print(f"  ✅ Alerta Rondas Día enviada OK ({total_marcaciones} marcaciones, {len(guardias)} guardias)")
    else:
        print(f"  ❌ Error: {err}")
    return ok


# ═══════════════════════════════════════════════════════
# TEST 3: ALERTA PMI CUMPLIMIENTO
# ═══════════════════════════════════════════════════════
def test_alerta_pmi_cumplimiento():
    """Prueba la alerta de cumplimiento PMI con datos simulados."""
    print("\n⚠️ [3/5] Probando Alerta PMI Cumplimiento...")

    hoy = datetime.now()
    fecha_iso = hoy.strftime("%Y-%m-%d")
    fecha_corta = hoy.strftime("%d-%m-%Y")
    dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    fecha_larga = f"{dias[hoy.weekday() + 1 if hoy.weekday() < 6 else 0]} {hoy.day} de {meses[hoy.month - 1]} de {hoy.year}"

    # Datos simulados
    lvs_faltantes = [
        {"codigo": "LV-03", "nombre": "Verificación Sistema Bombas", "sector": "GAVIOTAS", "frecuencia": "Semanal", "responsable": "Enc. Mantención"},
        {"codigo": "LV-07", "nombre": "Verificación Iluminación Áreas Comunes", "sector": "ALBATROS", "frecuencia": "Quincenal", "responsable": "Electricista"},
        {"codigo": "LV-12", "nombre": "Verificación Extintores", "sector": "PORTERÍA", "frecuencia": "Mensual", "responsable": "Jefe Operaciones"},
        {"codigo": "LV-15", "nombre": "Verificación Cámaras Seguridad", "sector": "GENERAL", "frecuencia": "Semanal", "responsable": "Enc. Seguridad"},
    ]

    total_programadas = 8
    total_completadas = total_programadas - len(lvs_faltantes)
    total_faltantes = len(lvs_faltantes)
    porcentaje = int((total_completadas / total_programadas) * 100) if total_programadas > 0 else 100

    faltantes_rows = "".join(
        f"""<tr>
          <td style="background:#fee2e2;font-weight:bold;color:#991b1b;font-family:Menlo,Consolas,monospace;font-size:12px;padding:8px 10px;border:1px solid #fecaca;">{escape_html(lv['codigo'])}</td>
          <td style="background:#fef2f2;font-weight:600;color:#7f1d1d;padding:8px 10px;border:1px solid #fecaca;">{escape_html(lv['nombre'])}</td>
          <td style="background:#fef2f2;color:#7f1d1d;padding:8px 10px;border:1px solid #fecaca;">{escape_html(lv['sector'])}</td>
          <td style="background:#fef2f2;color:#7f1d1d;padding:8px 10px;border:1px solid #fecaca;">{escape_html(lv['frecuencia'])}</td>
          <td style="background:#fef2f2;color:#7f1d1d;padding:8px 10px;border:1px solid #fecaca;">{escape_html(lv['responsable'])}</td>
        </tr>"""
        for lv in lvs_faltantes
    )

    html = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr>
          <td style="background:linear-gradient(135deg,#991b1b 0%,#7f1d1d 100%);padding:24px 28px;color:#ffffff;">
            <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:700;">⚠ FALTA CUMPLIMIENTO PMI</h1>
            <p style="margin:0;font-size:13px;opacity:0.92;">Plan de Mantenimiento Integral — Condominios Laguna Norte CyJ</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#1e293b;">
              Estimado Luis García (Jefe de Operaciones),
            </p>
            <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#1e293b;">
              El sistema de gestión <strong>Condominios Laguna Norte — CyJ</strong> ha detectado que al cierre del día
              <strong>{escape_html(fecha_larga)}</strong> existen <strong style="color:#991b1b;">{total_faltantes} Lista(s) de Verificación</strong>
              del Plan de Mantenimiento Integral (PMI) que estaban programadas para esa fecha y
              <strong>NO cuentan con registro de ejecución</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;margin:16px 0;">
              <tr><td style="padding:14px 18px;">
                <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#991b1b;">📅 Fecha del reporte: {escape_html(fecha_corta)}</p>
                <p style="margin:0;font-size:13px;color:#7f1d1d;">Porcentaje de cumplimiento: <strong>{porcentaje}%</strong> · Meta diaria: ≥ 90%</p>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
              <tr>
                <td width="33%" style="padding:0 4px 0 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#dbeafe;border-radius:8px;">
                    <tr><td style="padding:14px 8px;text-align:center;">
                      <div style="font-size:24px;font-weight:700;color:#1e40af;line-height:1;">{total_programadas}</div>
                      <div style="font-size:11px;font-weight:600;color:#1e40af;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">Programadas</div>
                    </td></tr>
                  </table>
                </td>
                <td width="33%" style="padding:0 4px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#dcfce7;border-radius:8px;">
                    <tr><td style="padding:14px 8px;text-align:center;">
                      <div style="font-size:24px;font-weight:700;color:#166534;line-height:1;">{total_completadas}</div>
                      <div style="font-size:11px;font-weight:600;color:#166534;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">Completadas</div>
                    </td></tr>
                  </table>
                </td>
                <td width="33%" style="padding:0 0 0 4px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fee2e2;border-radius:8px;">
                    <tr><td style="padding:14px 8px;text-align:center;">
                      <div style="font-size:24px;font-weight:700;color:#991b1b;line-height:1;">{total_faltantes}</div>
                      <div style="font-size:11px;font-weight:600;color:#991b1b;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">Faltantes</div>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:18px 0 10px 0;font-size:14px;font-weight:600;color:#1e293b;">Listas de Verificación FALTANTES:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
              <thead><tr>
                <th style="background:#fee2e2;color:#7f1d1d;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #fecaca;">Código</th>
                <th style="background:#fee2e2;color:#7f1d1d;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #fecaca;">Nombre LV</th>
                <th style="background:#fee2e2;color:#7f1d1d;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #fecaca;">Sector</th>
                <th style="background:#fee2e2;color:#7f1d1d;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #fecaca;">Frecuencia</th>
                <th style="background:#fee2e2;color:#7f1d1d;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #fecaca;">Responsable</th>
              </tr></thead>
              <tbody>{faltantes_rows}</tbody>
            </table>
            <p style="margin:18px 0 0 0;font-size:14px;line-height:1.6;color:#1e293b;">
              <strong>Acción requerida:</strong> Se solicita a Luis García (Jefe de Operaciones) coordinar la ejecución
              de las LVs pendientes o registrar la justificación correspondiente en el sistema a la brevedad.
            </p>
            <p style="margin:12px 0 0 0;font-size:13px;color:#64748b;">
              Este correo es generado automáticamente por el sistema. Las LVs completadas también quedan
              registradas en el módulo PMI del sistema y forman parte del histórico de cumplimiento.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
            Correo automático enviado desde {escape_html(EMAIL_FROM)} vía SMTP configurado · No responder directamente a este correo · Condominios CyJ · {fecha_iso}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    ok, err = enviar_correo(
        f"⚠ FALTA CUMPLIMIENTO PMI — {fecha_corta} ({total_faltantes} LVs pendientes) [PRUEBA]",
        html
    )
    if ok:
        print(f"  ✅ Alerta PMI Cumplimiento enviada OK ({total_faltantes} LVs faltantes, {porcentaje}% cumplimiento)")
    else:
        print(f"  ❌ Error: {err}")
    return ok


# ═══════════════════════════════════════════════════════
# TEST 4: INFORME SEMANAL
# ═══════════════════════════════════════════════════════
def test_informe_semanal():
    """Prueba el informe semanal con datos simulados."""
    print("\n📋 [4/5] Probando Informe Semanal...")

    hoy = datetime.now()
    # Calcular lunes y domingo de esta semana
    dia_semana = hoy.weekday()  # 0=lunes
    lunes = hoy - timedelta(days=dia_semana)
    domingo = lunes + timedelta(days=6)
    desde_str = lunes.strftime("%d-%m-%Y")
    hasta_str = domingo.strftime("%d-%m-%Y")

    # Datos simulados de resumen
    resumen = {
        "nuevasOTs": 12,
        "otsCompletadas": 5,
        "otsEnProgreso": 4,
        "otsPendientes": 3,
        "totalProyectos": 3,
        "proyectosCompletados": 1,
        "proyectosEnEjecucion": 2,
        "totalRondas": 187,
        "totalQrCreados": 2,
        "totalSolicitudes": 8,
        "solicitudesAprobadas": 3,
        "solicitudesPendientes": 5,
        "totalRendiciones": 4,
        "rendicionesAprobadas": 2,
        "rendicionesPendientes": 2,
        "totalPMI": 15,
        "pmiCompletados": 11,
        "pmiPendientes": 4,
    }

    html = f"""<!DOCTYPE html><html><body style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#0F2044;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="margin:0">CONDOMINIO LAGUNA NORTE</h1>
        <p style="margin:5px 0 0;color:#93C5FD">Informe Semanal de Gestión</p>
      </div>
      <div style="background:#F8FAFC;padding:20px;border:1px solid #E2E8F0;border-radius:0 0 8px 8px">
        <p style="color:#64748B">Período: <strong>{desde_str} al {hasta_str}</strong></p>
        <table style="width:100%;border-collapse:collapse;margin-top:15px;font-size:13px">
          <tr style="background:#1E3A5F;color:white">
            <td style="padding:8px">Área</td>
            <td style="padding:8px;text-align:center">Total</td>
            <td style="padding:8px;text-align:center">OK</td>
            <td style="padding:8px;text-align:center">Pend.</td>
          </tr>
          <tr style="background:white">
            <td>OTs</td>
            <td style="text-align:center">{resumen['nuevasOTs']}</td>
            <td style="text-align:center;color:green">{resumen['otsCompletadas']}</td>
            <td style="text-align:center;color:orange">{resumen['otsPendientes']}</td>
          </tr>
          <tr style="background:#F1F5F9">
            <td>Proyectos</td>
            <td style="text-align:center">{resumen['totalProyectos']}</td>
            <td style="text-align:center;color:green">{resumen['proyectosCompletados']}</td>
            <td style="text-align:center">{resumen['proyectosEnEjecucion']}</td>
          </tr>
          <tr style="background:white">
            <td>Solicitudes</td>
            <td style="text-align:center">{resumen['totalSolicitudes']}</td>
            <td style="text-align:center;color:green">{resumen['solicitudesAprobadas']}</td>
            <td style="text-align:center;color:orange">{resumen['solicitudesPendientes']}</td>
          </tr>
          <tr style="background:#F1F5F9">
            <td>Rendiciones</td>
            <td style="text-align:center">{resumen['totalRendiciones']}</td>
            <td style="text-align:center;color:green">{resumen['rendicionesAprobadas']}</td>
            <td style="text-align:center;color:orange">{resumen['rendicionesPendientes']}</td>
          </tr>
          <tr style="background:white">
            <td>PMI</td>
            <td style="text-align:center">{resumen['totalPMI']}</td>
            <td style="text-align:center;color:green">{resumen['pmiCompletados']}</td>
            <td style="text-align:center;color:orange">{resumen['pmiPendientes']}</td>
          </tr>
          <tr style="background:#F1F5F9">
            <td>Rondas QR</td>
            <td style="text-align:center" colspan="3">{resumen['totalRondas']}</td>
          </tr>
        </table>
        <p style="margin-top:15px;color:#64748B;font-size:12px;text-align:center">
          <em>Informe de prueba generado automáticamente. Período: {desde_str} al {hasta_str}</em>
        </p>
      </div>
    </body></html>"""

    ok, err = enviar_correo(
        f"📋 Informe Semanal - Laguna Norte ({desde_str} al {hasta_str}) [PRUEBA]",
        html
    )
    if ok:
        print(f"  ✅ Informe Semanal enviado OK")
    else:
        print(f"  ❌ Error: {err}")
    return ok


# ═══════════════════════════════════════════════════════
# TEST 5: BACKUP MENSUAL (notificación)
# ═══════════════════════════════════════════════════════
def test_backup_mensual():
    """Prueba la notificación de backup mensual."""
    print("\n💾 [5/5] Probando Notificación Backup Mensual...")

    hoy = datetime.now()
    mes_anterior = (hoy.replace(day=1) - timedelta(days=1)).strftime("%m-%Y")
    fecha_generacion = hoy.strftime("%d-%m-%Y %H:%M")

    # Simular contenido del backup
    backup_stats = {
        "ots": 45,
        "proyectos": 8,
        "solicitudes": 23,
        "rondas_total": 1247,
        "asistencia_registros": 180,
        "size_mb": 12.4,
    }

    html = email_wrap(
        "💾 Respaldo Automático Mensual",
        f"Respaldo correspondiente a {mes_anterior}",
        f"""
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#166534;">✅ Respaldo generado exitosamente</p>
          <p style="margin:0;font-size:13px;color:#15803d;">
            El respaldo automático mensual se completó sin errores.
            El archivo ZIP ha sido adjuntado a este correo.
          </p>
        </div>

        <h2 style="font-size:15px;color:#0f2040;margin:20px 0 10px;">📊 Contenido del Respaldo</h2>
        <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:20px;">
          <thead><tr style="background-color:{COLOR_PRIMARY};color:#fff;">
            <th style="padding:8px 12px;text-align:left;">Módulo</th>
            <th style="padding:8px 12px;text-align:center;">Registros</th>
          </tr></thead>
          <tbody>
            <tr style="background:#fff;"><td style="padding:6px 12px;border:1px solid #e2e8f0;">Órdenes de Trabajo</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;font-weight:600;">{backup_stats['ots']}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding:6px 12px;border:1px solid #e2e8f0;">Proyectos</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;font-weight:600;">{backup_stats['proyectos']}</td></tr>
            <tr style="background:#fff;"><td style="padding:6px 12px;border:1px solid #e2e8f0;">Solicitudes de Compra</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;font-weight:600;">{backup_stats['solicitudes']}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding:6px 12px;border:1px solid #e2e8f0;">Lecturas QR Rondas</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;font-weight:600;">{backup_stats['rondas_total']}</td></tr>
            <tr style="background:#fff;"><td style="padding:6px 12px;border:1px solid #e2e8f0;">Registros Asistencia</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;font-weight:600;">{backup_stats['asistencia_registros']}</td></tr>
          </tbody>
        </table>

        <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;font-size:13px;color:#1e40af;">
            <strong>Archivo:</strong> Respaldo_CyJ_{hoy.strftime('%Y-%m')}.zip<br/>
            <strong>Tamaño:</strong> {backup_stats['size_mb']} MB<br/>
            <strong>Generado:</strong> {fecha_generacion}
          </p>
        </div>

        <p style="font-size:12px;color:#64748b;">
          Este respaldo se genera automáticamente el 1° de cada mes. El archivo contiene
          todos los OTs (PDFs + fotos), Proyectos, Solicitudes, Rondas, Asistencia y
          un export completo de la base de datos en formato JSON.
        </p>
        """
    )

    ok, err = enviar_correo(
        f"💾 Respaldo Mensual CyJ — {mes_anterior} [PRUEBA]",
        html
    )
    if ok:
        print(f"  ✅ Notificación Backup Mensual enviada OK")
    else:
        print(f"  ❌ Error: {err}")
    return ok


# ═══════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════
def main():
    print("=" * 60)
    print("  PRUEBA DE AUTOMATIZACIONES - SISTEMA CYJ")
    print(f"  {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}")
    print("=" * 60)
    print(f"\n  SMTP: {SMTP_HOST}:{SMTP_PORT}")
    print(f"  User: {SMTP_USER}")
    print(f"  To:   {EMAIL_TO}")
    print(f"  CC:   {EMAIL_CC}")

    # Probar conexión SMTP primero
    print("\n🔗 Probando conexión SMTP...")
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
        print("  ✅ Conexión SMTP exitosa")
    except Exception as e:
        print(f"  ❌ Error conexión SMTP: {e}")
        print("\n  No se pueden ejecutar las pruebas sin conexión SMTP.")
        sys.exit(1)

    # Ejecutar todas las pruebas
    resultados = {}
    resultados["ronda_noche"] = test_alerta_ronda_noche()
    resultados["ronda_dia"] = test_alerta_ronda_dia()
    resultados["pmi_cumplimiento"] = test_alerta_pmi_cumplimiento()
    resultados["informe_semanal"] = test_informe_semanal()
    resultados["backup_mensual"] = test_backup_mensual()

    # Resumen
    print("\n" + "=" * 60)
    print("  RESUMEN DE RESULTADOS")
    print("=" * 60)
    ok_count = sum(1 for v in resultados.values() if v)
    total_count = len(resultados)
    for name, ok in resultados.items():
        status = "✅ OK" if ok else "❌ FAIL"
        print(f"  {name:<25} {status}")
    print(f"\n  Total: {ok_count}/{total_count} exitosas")

    if ok_count == total_count:
        print("\n  🎉 Todas las automatizaciones funcionan correctamente!")
    else:
        print(f"\n  ⚠️ {total_count - ok_count} automatización(es) con errores")

    return ok_count == total_count


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
