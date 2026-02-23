import streamlit as st
import requests

API_URL = "https://f73v8247gf.execute-api.us-east-1.amazonaws.com/default/ft-rostros"

st.set_page_config(page_title="Detector de Emociones", layout="wide", page_icon="😊")

st.markdown("""
    <style>
        .titulo { text-align: center; font-size: 2.5rem; font-weight: 800; margin-bottom: 0.2rem; }
        .subtitulo { text-align: center; color: #888; font-size: 1rem; margin-bottom: 2rem; }
        .card {
            background: #1e1e2e;
            border-radius: 16px;
            padding: 1.2rem;
            margin-bottom: 1rem;
            border: 1px solid #2e2e3e;
        }
        .emocion-badge {
            display: inline-block;
            background: #6c63ff;
            color: white;
            border-radius: 999px;
            padding: 0.3rem 1rem;
            font-weight: 600;
            font-size: 1rem;
        }
        .confianza { color: #aaa; font-size: 0.9rem; margin-top: 0.4rem; }
    </style>
""", unsafe_allow_html=True)

st.markdown('<div class="titulo">😊 Detector de Emociones</div>', unsafe_allow_html=True)
st.markdown('<div class="subtitulo">Sube una foto y detectamos la emoción con IA</div>', unsafe_allow_html=True)

if "historial" not in st.session_state:
    st.session_state.historial = []

col1, col2 = st.columns([1, 1], gap="large")

with col1:
    st.markdown("#### 📤 Subir imagen")
    uploaded_file = st.file_uploader("", type=["jpg", "jpeg", "png"])

    if uploaded_file:
        st.image(uploaded_file, caption="Vista previa", use_container_width=True)
        image_bytes = uploaded_file.read()

        if st.button("🔍 Analizar emoción", use_container_width=True):
            try:
                with st.spinner("Analizando imagen..."):
                    response = requests.post(
                        API_URL,
                        data=image_bytes,
                        headers={"Content-Type": "application/octet-stream"}
                    )
                    data = response.json()

                st.session_state.historial.append({
                    "url": data["image_url"],
                    "emocion": data["emocion"],
                    "porcentaje": data["porcentaje"],
                    "emoji": data["emoji"]
                })

                ultimo = st.session_state.historial[-1]
                st.success("✅ Análisis completado")
                st.markdown(f"""
                    <div class="card">
                        <div class="emocion-badge">{ultimo['emoji']} {ultimo['emocion']}</div>
                        <div class="confianza">Confianza: {ultimo['porcentaje']}%</div>
                    </div>
                """, unsafe_allow_html=True)

            except Exception as e:
                st.error(f"❌ Error: {str(e)}")

with col2:
    st.markdown("#### 🕓 Historial")

    if not st.session_state.historial:
        st.markdown("<div style='color:#666; margin-top:1rem;'>Aún no hay imágenes analizadas.</div>", unsafe_allow_html=True)
    else:
        for i, item in enumerate(reversed(st.session_state.historial), 1):
            num = len(st.session_state.historial) - i + 1
            with st.container():
                st.markdown(f"""
                    <div class="card">
                        <div style="font-weight:600; margin-bottom:0.5rem;">Imagen #{num}</div>
                        <div class="emocion-badge">{item['emoji']} {item['emocion']}</div>
                        <div class="confianza">Confianza: {item['porcentaje']}%</div>
                    </div>
                """, unsafe_allow_html=True)
                st.image(item["url"], use_container_width=True)
                st.markdown(f"[🔗 Ver imagen completa]({item['url']})")
                st.markdown("---")