import React from "react";
import { CATS } from "../constants";
import { HomeNews } from "./HomeNews";
import { FundamentalAnalysis } from "./FundamentalAnalysis";
import { motion } from "motion/react";
import { Ticker } from "../types";

export const FundamentalDashboard = ({ cat, ticker }: { cat: keyof typeof CATS, ticker: Ticker | null }) => {
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Fundamental Analysis</h2>
            <p className="text-xs text-white/40 mt-1">AI-powered insights, financials, and live news.</p>
          </div>
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
          <div className="mb-6">
            <h3 className="text-2xl font-bold font-mono tracking-tighter">{ticker.symbol.split(".")[0]}</h3>
            <p className="text-sm text-white/40">{ticker.name}</p>
          </div>
          <FundamentalAnalysis ticker={ticker} />
        </motion.div>
      )}
    </div>
  );
};
