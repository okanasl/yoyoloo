import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


export async function POST(request: NextRequest) {
  try {

    const body = await request.json()
    const project = await prisma.project.create({
      data: body
    })

    return NextResponse.json(project)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET() {
  try {

    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    await prisma.project.delete({
      where: {
        id,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
