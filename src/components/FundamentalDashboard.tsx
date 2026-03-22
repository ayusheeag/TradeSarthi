import React, { useRef, useState } from "react";
import { CATS } from "../constants";
import { HomeNews } from "./HomeNews";
import { FundamentalAnalysis } from "./FundamentalAnalysis";
import { motion } from "motion/react";
import { Ticker } from "../types";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export const FundamentalDashboard = ({ cat, ticker }: { cat: keyof typeof CATS, ticker: Ticker | null }) => {
  const analysisRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    if (!analysisRef.current || !ticker) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(analysisRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#050505"
      });
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas is empty");
      }
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`TradeSaarthi_${ticker.symbol}_Fundamental_Analysis.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div />
          {ticker && (
            <button 
              onClick={exportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all disabled:opacity-50 ml-auto"
            >
              <Download size={14} className={isExporting ? "animate-bounce" : ""} />
              {isExporting ? "GENERATING..." : "DOWNLOAD REPORT"}
            </button>
          )}
        </div>
      </div>

      {!ticker ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="space-y-6"
        >
          {/* HOME NEWS */}
          <HomeNews cat={cat} />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div ref={analysisRef} className="bg-[#050505] p-2 -m-2 rounded-3xl">
            <div className="mb-6 px-2 pt-2">
            <h3 className="text-2xl font-bold font-mono tracking-tighter">{ticker.symbol.split(".")[0]}</h3>
            <p className="text-sm text-white/40">{ticker.name}</p>
          </div>
          <FundamentalAnalysis ticker={ticker} />
          </div>
        </motion.div>
      )}
    </div>
  );
};
