import { NextResponse } from "next/server";

export async function GET() {
    try {
        const response = await fetch(
            "http://127.0.0.1:8001/rates/EURUSD?timeframe=M1&count=100",
            {
                method: "GET",
                headers: {
                    "X-API-Key": "mtb_585ada1b6fd4ef5a426572d3ceb72e3d4578b7d76931dca65900522e63e61e2e",
                },
                cache: "no-store",
            }
        );
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json(data, {
                status: response.status,
            });
        }
        return NextResponse.json(data);
    } catch (error:any) {
        console.log("MT5 rates error:", error.message);
        // console.error("MT5 rates error:", error);
        return NextResponse.json(
            {
                error: "Failed to connect to MT5",
            },
            {
                status: 500,
            }
        );
    }
}