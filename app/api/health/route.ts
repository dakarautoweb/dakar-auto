import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export async function GET() {
    const { error } = await supabaseAdmin
        .from('parts_requests')
        .select('id')
        .limit(1)

    if (error) {
        return NextResponse.json(
            {
                ok: false,
                error: error.message,
            },
            { status: 500 }
        )
    }

    return NextResponse.json({
        ok: true,
        message: 'Dakar Auto API and Supabase are connected',
    })
}