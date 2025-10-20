// components/SalesOfferPdf.jsx
import React, { useEffect, useMemo, useState } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import "pdfmake/build/vfs_fonts"; // provides Roboto with PL characters
import logo from "../assets/logo.png";

/** Tiny helper: bundle image -> dataURL for pdfmake */
function loadImageAsDataURL(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

export default function SalesOfferPdf({ api, document: doc, lang = "pl" }) {
  const T =
    lang === "en"
      ? {
          title: "Sales Offer",
          download: "Download PDF",
          generating: "Generating…",
          // sections
          header: "Header",
          dates: "Dates",
          audit: "Audit",
          sellTo: "Sell-to",
          billTo: "Bill-to",
          location: "Location",
          shipment: "Shipment",
          transport: "Transport",
          broker: "Broker",
          lines: "Lines",
          totals: "Totals",
          // kv
          docNo: "Document No.",
          externalDocumentNo: "External Doc. No.",
          documentInfo: "Document Info",
          status: "Status",
          currency: "Currency",
          documentDate: "Document Date",
          serviceDate: "Service/Delivery Date",
          requestedDeliveryDate: "Requested Delivery Date",
          promisedDeliveryDate: "Promised Delivery Date",
          shipmentDate: "Shipment Date",
          validityDate: "Document Validity Date",
          dueDate: "Due Date",
          createdBy: "Created By",
          createdAt: "Created At",
          modifiedBy: "Modified By",
          modifiedAt: "Modified At",
          // party
          no: "No",
          name: "Name",
          name2: "Name 2",
          address: "Address",
          address2: "Address 2",
          city: "City",
          region: "Region",
          postCode: "Post Code",
          country: "Country",
          email: "E-mail",
          phone: "Phone",
          nip: "Tax ID",
          method: "Method",
          agent: "Agent",
          transportNo: "Transport No.",
          transportName: "Transport Name",
          transportId: "Transport ID",
          driverName: "Driver Name",
          driverId: "Driver ID",
          driverEmail: "Driver Email",
          driverPhone: "Driver Phone",
          brokerNo: "Broker No.",
          // lines table
          lineNo: "Line No.",
          type: "Type",
          item: "Item",
          uom: "UOM",
          unitPrice: "Unit Price",
          qty: "Qty",
          lineValue: "Line Value",
          transportCost: "Transport",
          // totals
          sumLines: "Sum of lines",
          sumTransport: "Transport total",
          grandTotal: "Grand total",
        }
      : {
          title: "Oferta sprzedaży",
          download: "Pobierz PDF",
          generating: "Generowanie…",
          // sections
          header: "Nagłówek",
          dates: "Daty",
          audit: "Audyt",
          sellTo: "Odbiorca (Sell-to)",
          billTo: "Płatnik (Bill-to)",
          location: "Lokalizacja",
          shipment: "Wysyłka",
          transport: "Transport",
          broker: "Pośrednik",
          lines: "Pozycje",
          totals: "Podsumowanie",
          // kv
          docNo: "Nr dokumentu",
          externalDocumentNo: "Zewn. nr dokumentu",
          documentInfo: "Informacje o dokumencie",
          status: "Status",
          currency: "Waluta",
          documentDate: "Data dokumentu",
          serviceDate: "Data usługi/dostawy",
          requestedDeliveryDate: "Żądana data dostawy",
          promisedDeliveryDate: "Obiecana data dostawy",
          shipmentDate: "Data wysyłki",
          validityDate: "Ważność dokumentu",
          dueDate: "Termin płatności",
          createdBy: "Utworzył",
          createdAt: "Data utworzenia",
          modifiedBy: "Zmodyfikował",
          modifiedAt: "Data modyfikacji",
          // party
          no: "Nr",
          name: "Nazwa",
          name2: "Nazwa 2",
          address: "Adres",
          address2: "Adres 2",
          city: "Miasto",
          region: "Województwo/Region",
          postCode: "Kod pocztowy",
          country: "Kraj",
          email: "E-mail",
          phone: "Telefon",
          nip: "NIP",
          method: "Metoda",
          agent: "Agent",
          transportNo: "Nr transportu",
          transportName: "Nazwa transportu",
          transportId: "ID transportu",
          driverName: "Kierowca",
          driverId: "ID kierowcy",
          driverEmail: "E-mail kierowcy",
          driverPhone: "Telefon kierowcy",
          brokerNo: "Nr pośrednika",
          // lines table
          lineNo: "Poz.",
          type: "Typ",
          item: "Towar",
          uom: "JM",
          unitPrice: "Cena jedn.",
          qty: "Ilość",
          lineValue: "Wartość pozycji",
          transportCost: "Transport",
          // totals
          sumLines: "Suma pozycji",
          sumTransport: "Transport razem",
          grandTotal: "Razem do zapłaty",
        };

  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // format helpers
  const fmt = (n, d = 2) =>
    Number.isFinite(Number(n))
      ? Number(n).toLocaleString(lang === "en" ? "en-GB" : "pl-PL", {
          minimumFractionDigits: d,
          maximumFractionDigits: d,
        })
      : "—";
  const dDate = (s) => {
    try {
      return s
        ? new Date(s).toLocaleDateString(lang === "en" ? "en-GB" : "pl-PL")
        : "—";
    } catch {
      return s || "—";
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);

        // 1) Load lines
        const params = new URLSearchParams({
          page: "1",
          limit: "500",
          documentNo: doc.documentNo || "",
        });
        const res = await fetch(`${api}/api/sales-offer-lines?${params.toString()}`);
        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json?.data) ? json.data : [];

        // 2) Compute totals
        const sumLines = rows.reduce((a, r) => a + (Number(r.lineValue) || 0), 0);
        const sumTransport = rows.reduce((a, r) => a + (Number(r.transportCost) || 0), 0);
        const grand = sumLines + sumTransport;

        // 3) Load logo
        const logoDataUrl = await loadImageAsDataURL(logo);

        // 4) Build document
        const docDefinition = {
          pageSize: "A4",
          pageMargins: [36, 36, 36, 48],
          defaultStyle: { font: "Roboto", fontSize: 9 },
          styles: {
            h1: { fontSize: 16, bold: true, margin: [0, 8, 0, 8] },
            boxTitle: { bold: true, fillColor: "#f8fafc", margin: [0, 0, 0, 4] },
            kvLabel: { color: "#6b7280" },
            kvValue: { bold: true },
            sectionTitle: { bold: true, margin: [0, 10, 0, 6] },
            right: { alignment: "right" },
            small: { fontSize: 8, color: "#6b7280" },
          },
          content: [
            // Red header band with white logo (image has to be white-on-transparent)
            {
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      columns: [
                        { image: logoDataUrl, width: 120, margin: [8, 6, 0, 6] },
                        { width: "*", text: "" },
                      ],
                      fillColor: "#dc2626", // red-600
                    },
                  ],
                ],
              },
              layout: "noBorders",
              margin: [-36, -36, -36, 12], // edge to edge
            },

            { text: T.title, style: "h1" },

            // Header + Dates (two columns)
            {
              columns: [
                {
                  width: "50%",
                  table: {
                    widths: ["42%", "*"],
                    body: [
                      [{ text: T.header, colSpan: 2, style: "boxTitle" }, {}],
                      [{ text: T.docNo, style: "kvLabel" }, { text: String(doc.documentNo || "—"), style: "kvValue" }],
                      [{ text: T.externalDocumentNo, style: "kvLabel" }, { text: String(doc.externalDocumentNo || "—"), style: "kvValue" }],
                      [{ text: T.documentInfo, style: "kvLabel" }, { text: String(doc.documentInfo || "—"), style: "kvValue" }],
                      [{ text: T.status, style: "kvLabel" }, { text: String(doc.status || "—"), style: "kvValue" }],
                      [
                        { text: T.currency, style: "kvLabel" },
                        {
                          text: `${doc.currencyCode || "—"}${doc.currencyFactor ? ` • ${fmt(doc.currencyFactor, 4)}` : ""}`,
                          style: "kvValue",
                        },
                      ],
                    ],
                  },
                  layout: "lightHorizontalLines",
                },
                { width: 12, text: "" },
                {
                  width: "50%",
                  table: {
                    widths: ["48%", "*"],
                    body: [
                      [{ text: T.dates, colSpan: 2, style: "boxTitle" }, {}],
                      [{ text: T.documentDate, style: "kvLabel" }, { text: dDate(doc.documentDate), style: "kvValue" }],
                      [{ text: T.serviceDate, style: "kvLabel" }, { text: dDate(doc.serviceDate), style: "kvValue" }],
                      [{ text: T.requestedDeliveryDate, style: "kvLabel" }, { text: dDate(doc.requestedDeliveryDate), style: "kvValue" }],
                      [{ text: T.promisedDeliveryDate, style: "kvLabel" }, { text: dDate(doc.promisedDeliveryDate), style: "kvValue" }],
                      [{ text: T.shipmentDate, style: "kvLabel" }, { text: dDate(doc.shipmentDate), style: "kvValue" }],
                      [{ text: T.validityDate, style: "kvLabel" }, { text: dDate(doc.validityDate), style: "kvValue" }],
                      [{ text: T.dueDate, style: "kvLabel" }, { text: dDate(doc.dueDate), style: "kvValue" }],
                    ],
                  },
                  layout: "lightHorizontalLines",
                },
              ],
              margin: [0, 0, 0, 10],
            },

            // Audit (full width)
            {
              table: {
                widths: ["25%", "*", "25%", "*"],
                body: [
                  [{ text: T.audit, colSpan: 4, style: "boxTitle" }, {}, {}, {}],
                  [
                    { text: T.createdBy, style: "kvLabel" },
                    { text: String(doc.userCreated || "—"), style: "kvValue" },
                    { text: T.createdAt, style: "kvLabel" },
                    { text: dDate(doc.dateCreated), style: "kvValue" },
                  ],
                  [
                    { text: T.modifiedBy, style: "kvLabel" },
                    { text: String(doc.userModified || "—"), style: "kvValue" },
                    { text: T.modifiedAt, style: "kvLabel" },
                    { text: dDate(doc.dateModified), style: "kvValue" },
                  ],
                ],
              },
              layout: "lightHorizontalLines",
              margin: [0, 0, 0, 10],
            },

            // Parties + blocks
            { text: T.sellTo, style: "sectionTitle" },
            partyTable(T, {
              no: doc.sellCustomerNo,
              name: doc.sellCustomerName,
              name2: doc.sellCustomerName2,
              address: doc.sellCustomerAddress,
              address2: doc.sellCustomerAddress2,
              city: doc.sellCustomerCity,
              region: doc.sellCustomerRegion,
              postCode: doc.sellCustomerPostCode,
              country: doc.sellCustomerCountry,
              email: doc.sellCustomerEmail,
              phone: doc.sellCustomerPhoneNo,
            }),

            { text: T.billTo, style: "sectionTitle" },
            partyTable(T, {
              no: doc.billCustomerNo,
              name: doc.billCustomerName,
              name2: doc.billCustomerName2,
              address: doc.billCustomerAddress,
              address2: doc.billCustomerAddress2,
              city: doc.billCustomerCity,
              region: doc.billCustomerRegion,
              postCode: doc.billCustomerPostCode,
              country: doc.billCustomerCountry,
              email: doc.billCustomerEmail,
              phone: doc.billCustomerPhoneNo,
              nip: doc.billCustomerNip,
            }),

            { text: T.location, style: "sectionTitle" },
            partyTable(T, {
              no: doc.locationNo,
              name: doc.locationName,
              name2: doc.locationName2,
              address: doc.locationAddress,
              address2: doc.locationAddress2,
              city: doc.locationCity,
              region: doc.locationRegion,
              postCode: doc.locationPostCode,
              country: doc.locationCountry,
              email: doc.locationEmail,
              phone: doc.locationPhoneNo,
            }),

            { text: T.shipment, style: "sectionTitle" },
            blockTable([
              [T.method, textOrDash(doc.shipmentMethod)],
              [T.agent, textOrDash(doc.shipmentAgent)],
            ]),

            { text: T.transport, style: "sectionTitle" },
            blockTable([
              [T.transportNo, textOrDash(doc.transportNo)],
              [T.transportName, textOrDash(doc.transportName)],
              [T.transportId, textOrDash(doc.transportId)],
              [T.driverName, textOrDash(doc.transportDriverName)],
              [T.driverId, textOrDash(doc.transportDriverId)],
              [T.driverEmail, textOrDash(doc.transportDriverEmail)],
              [T.driverPhone, textOrDash(doc.transportDriverPhoneNo)],
            ]),

            { text: T.broker, style: "sectionTitle" },
            partyTable(T, {
              no: doc.brokerNo,
              name: doc.brokerName,
              name2: doc.brokerName2,
              address: doc.brokerAddress,
              address2: doc.brokerAddress2,
              city: doc.brokerCity,
              region: doc.brokerRegion,
              postCode: doc.brokerPostCode,
              country: doc.brokerCountry,
              email: doc.brokerEmail,
              phone: doc.brokerPhoneNo,
            }),

            // Lines
            { text: T.lines, style: "sectionTitle" },
            {
              table: {
                headerRows: 1,
                widths: [38, 50, "*", 48, 60, 40, 70, 70],
                body: [
                  [
                    { text: T.lineNo, style: "kvLabel" },
                    { text: T.type, style: "kvLabel" },
                    { text: T.item, style: "kvLabel" },
                    { text: T.uom, style: "kvLabel" },
                    { text: T.unitPrice, style: "kvLabel", alignment: "right" },
                    { text: T.qty, style: "kvLabel", alignment: "right" },
                    { text: T.lineValue, style: "kvLabel", alignment: "right" },
                    { text: T.transportCost, style: "kvLabel", alignment: "right" },
                  ],
                  ...(rows.length
                    ? rows.map((ln) => [
                        textOrDash(ln?.lineNo),
                        textOrDash(ln?.lineType),
                        textOrDash(ln?.itemNo),
                        textOrDash(ln?.unitOfMeasure),
                        { text: fmt(ln?.unitPrice, 2), alignment: "right" },
                        { text: fmt(ln?.quantity, 3), alignment: "right" },
                        { text: fmt(ln?.lineValue, 2), alignment: "right" },
                        { text: fmt(ln?.transportCost, 2), alignment: "right" },
                      ])
                    : [
                        [
                          { text: "—", colSpan: 8, alignment: "center" },
                          {},
                          {},
                          {},
                          {},
                          {},
                          {},
                          {},
                        ],
                      ]),
                ],
              },
              layout: "lightHorizontalLines",
            },

            // Totals box (right aligned)
            {
              columns: [
                { width: "*", text: "" },
                {
                  width: 260,
                  table: {
                    widths: ["60%", "40%"],
                    body: [
                      [{ text: T.totals, colSpan: 2, style: "boxTitle" }, {}],
                      [
                        { text: T.sumLines, style: "kvLabel" },
                        {
                          text: `${fmt(sumLines, 2)} ${doc.currencyCode || ""}`,
                          style: "kvValue",
                          alignment: "right",
                        },
                      ],
                      [
                        { text: T.sumTransport, style: "kvLabel" },
                        {
                          text: `${fmt(sumTransport, 2)} ${doc.currencyCode || ""}`,
                          style: "kvValue",
                          alignment: "right",
                        },
                      ],
                      [
                        { text: T.grandTotal, style: "kvLabel" },
                        {
                          text: `${fmt(grand, 2)} ${doc.currencyCode || ""}`,
                          style: "kvValue",
                          alignment: "right",
                        },
                      ],
                    ],
                  },
                  layout: "lightHorizontalLines",
                  margin: [0, 8, 0, 0],
                },
              ],
            },
          ],
          footer: (current, total) => ({
            columns: [
              { text: `${doc.documentNo || ""}`, style: "small" },
              {
                text: `${current} / ${total}`,
                alignment: "right",
                style: "small",
              },
            ],
            margin: [36, 0],
          }),
        };

        // 5) Create PDF -> Blob
        const blob = await createPdfBlob(docDefinition);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (e) {
        if (!cancelled) setErr(String(e?.message || e || "PDF error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, doc?.documentNo, lang]);

  const fileName = useMemo(
    () => `${doc.documentNo || "sales-offer"}.pdf`,
    [doc.documentNo]
  );

  if (err) return <div style={{ color: "crimson" }}>PDF error: {err}</div>;

  return (
    <div style={{ height: "75vh", display: "flex", flexDirection: "column", gap: 8 }}>
      {loading && <div>{T.generating}</div>}
      {!loading && blobUrl && (
        <>
          <iframe
            title="PDF preview"
            src={blobUrl}
            style={{ flex: 1, width: "100%", border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <a
              href={blobUrl}
              download={fileName}
              style={{
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              {T.download}
            </a>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- helpers for pdfmake blocks ---------------- */

function textOrDash(v) {
  return v === 0 || v ? String(v) : "—";
}

function partyTable(T, p) {
  // give labels a bit more width so PL strings don't wrap too early
  return {
    table: {
      widths: ["38%", "*"],
      body: [
        [T.no, textOrDash(p.no)],
        [T.name, textOrDash(p.name)],
        [T.name2, textOrDash(p.name2)],
        [T.address, textOrDash(p.address)],
        [T.address2, textOrDash(p.address2)],
        [T.city, textOrDash(p.city)],
        [T.region, textOrDash(p.region)],
        [T.postCode, textOrDash(p.postCode)],
        [T.country, textOrDash(p.country)],
        [T.email, textOrDash(p.email)],
        [T.phone, textOrDash(p.phone)],
        ...(p.nip ? [[T.nip, textOrDash(p.nip)]] : []),
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10],
  };
}

function blockTable(rows) {
  return {
    table: {
      widths: ["38%", "*"],
      body: rows.map(([k, v]) => [k, v]),
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10],
  };
}

function createPdfBlob(docDefinition) {
  return new Promise((resolve, reject) => {
    try {
      const pdf = pdfMake.createPdf(docDefinition);
      pdf.getBlob((blob) => resolve(blob));
    } catch (e) {
      reject(e);
    }
  });
}
