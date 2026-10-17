async function getExchangeRate() {
    const cacheKey = "exchangeRateData";
    const cacheTimeKey = "exchangeRateTime";
    const cacheDuration = 30 * 60 * 1000;

    let cachedData = null;
    let cachedTime = 0;

    try {
        cachedData = localStorage.getItem(cacheKey);
        cachedTime = Number(localStorage.getItem(cacheTimeKey)) || 0;
    } catch (error) {
        console.warn("No se pudo acceder a la caché local.", error);
    }

    if (cachedData && cachedTime && Date.now() - cachedTime < cacheDuration) {
        try {
            console.log("Tipo de cambio cargado desde la caché.");
            return JSON.parse(cachedData);
        } catch {
            console.warn("La caché del tipo de cambio no es válida.");
        }
    }

    try {
        const response = await fetch("https://api.hacienda.go.cr/indicadores/tc");

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (!data?.dolar?.compra || !data?.dolar?.venta) {
            throw new Error("La respuesta no contiene los datos esperados.");
        }

        try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
            localStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (error) {
            console.warn("No se pudo guardar la caché.", error);
        }

        console.log("Tipo de cambio cargado desde la API.");
        return data;
    } catch (error) {
        console.error("No se pudo consultar el tipo de cambio:", error);

        if (cachedData) {
            try {
                return JSON.parse(cachedData);
            } catch {
                return null;
            }
        }

        return null;
    }
}

async function loadExchangeRateWidget() {
    const widget = document.getElementById("exchangeRateWidget");

    if (!widget) {
        return;
    }

    const buyElement = document.getElementById("exchangeRateBuy");
    const sellElement = document.getElementById("exchangeRateSell");
    const euroElement = document.getElementById("exchangeRateEuro");
    const statusElement = document.getElementById("exchangeRateStatus");

    statusElement.textContent = "Consultando tipo de cambio...";
    statusElement.classList.remove("exchange-rate-error");

    const data = await getExchangeRate();

    if (!data) {
        statusElement.textContent = "No se pudo cargar el tipo de cambio.";
        statusElement.classList.add("exchange-rate-error");
        return;
    }

    const formatCurrency = value =>
        Number(value).toLocaleString("es-CR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    buyElement.textContent = `₡${formatCurrency(data.dolar.compra.valor)}`;
    sellElement.textContent = `₡${formatCurrency(data.dolar.venta.valor)}`;

    if (data.euro && data.euro.colones != null) {
        euroElement.textContent = `₡${formatCurrency(data.euro.colones)}`;
    } else {
        euroElement.textContent = "No disponible";
    }

    const cacheTime = Number(localStorage.getItem("exchangeRateTime")) || 0;
    const isCached = cacheTime > 0 && Date.now() - cacheTime < 30 * 60 * 1000;

    statusElement.textContent = isCached
        ? "Valores consultados o almacenados recientemente."
        : "Tipo de cambio actualizado.";
}

document.addEventListener("DOMContentLoaded", loadExchangeRateWidget);
