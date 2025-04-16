import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';


// Create project
export async function POST(request: NextRequest) {
  try {
    const cook = cookies()
    const supabase = createClient(cook);
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const project = await prisma.project.create({
      data: {
        ...body,
        userId: user.id
      }
    })

    return NextResponse.json(project)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Get all projects for user
export async function GET(request: NextRequest) {
  try {
    const cook = cookies()
    const supabase = createClient(cook);

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        name: true,
        userId: true,
      }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


// Delete project
export async function DELETE(request: NextRequest) {
  try {
    const cook = cookies()
    const supabase = createClient(cook);
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    await prisma.project.delete({
      where: {
        id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}