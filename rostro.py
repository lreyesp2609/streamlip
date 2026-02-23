import streamlit as st
import requests

API_URL = "https://f73v8247gf.execute-api.us-east-1.amazonaws.com/default/ft-rostros"

st.set_page_config(page_title="Lector de Placas", page_icon="🚗")

st.title("🚗 Lector de Placas")
st.caption("Sube una foto de un vehículo y extraemos la placa con IA")
st.divider()

if "historial" not in st.session_state:
    st.session_state.historial = []

uploaded_file = st.file_uploader("Sube una imagen", type=["jpg", "jpeg", "png"])

if uploaded_file:
    st.image(uploaded_file, width=280)
    image_bytes = uploaded_file.read()

    if st.button("🔍 Detectar placa", use_container_width=True):
        with st.spinner("Analizando imagen..."):
            try:
                response = requests.post(
                    API_URL,
                    data=image_bytes,
                    headers={"Content-Type": "application/octet-stream"}
                )
                data = response.json()

                if "error" in data:
                    st.error(f"⚠️ {data['error']}")
                    if "textos_detectados" in data:
                        st.caption(f"Textos encontrados: {', '.join(data['textos_detectados'])}")
                else:
                    placas = data.get("placas", [])
                    for placa in placas:
                        st.session_state.historial.append({
                            "url": data["image_url"],
                            "placa": placa,
                        })
                    st.success(f"✅ {'Placa detectada' if len(placas) == 1 else f'{len(placas)} placas detectadas'}")

            except Exception as e:
                st.error(f"❌ Error: {str(e)}")

if st.session_state.historial:
    st.divider()
    st.subheader("🕓 Historial")

    for i, item in enumerate(reversed(st.session_state.historial), 1):
        num = len(st.session_state.historial) - i + 1
        with st.expander(f"🚘 {item['placa']} — #{num}"):
            col_img, col_info = st.columns([1, 1])
            with col_img:
                st.image(item["url"], width=260)
            with col_info:
                st.metric(label="Placa detectada", value=item["placa"])

    st.divider()
    if st.button("🗑️ Limpiar historial", use_container_width=True):
        st.session_state.historial = []
        st.rerun()