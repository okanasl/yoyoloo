import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {

    const project = await prisma.project.findUnique({
      where: {
        id: params.id,
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


// Update project
export async function PATCH(request: NextRequest,
  { params }: { params: { id: string } }) {
  try {

    const body = await request.json()

    const project = await prisma.project.update({
      where: {
        id: params.id,
      },
      data: body
    })

    return NextResponse.json(project)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}