import { NextResponse } from 'next/server';
import { revalidateTag, unstable_cache } from 'next/cache';
import prisma from '@/app/lib/prisma';

const getCategories = unstable_cache(
    async (fetchAll = false) => {
        const whereClause = fetchAll ? {} : { active: true };
        return await prisma.category.findMany({
            select: { id: true, name: true, icon: true, order: true, active: true },
            orderBy: { order: 'asc' },
            where: whereClause
        });
    },
    ['categories-list'], // Base key
    { tags: ['categories'] }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';
    
    // We must pass the dynamic part to key explicitly if unstable_cache wrapper doesn't handle args automatically (it doesn't for the key array)
    // Actually, distinct function calls with different arguments need distinct keys.
    // The previous definition was flawed. Let's redefine it properly here.
  } catch (e) {} // unreachable placeholder
}

// Correct approach: Define the cached function OUTSIDE with strict keys
const getCategoriesCached = async (fetchAll) => {
    const fn = unstable_cache(
        async () => {
             const whereClause = fetchAll ? {} : { active: true };
             return await prisma.category.findMany({
                select: { id: true, name: true, icon: true, order: true, active: true },
                orderBy: { order: 'asc' },
                where: whereClause
            });
        },
        ['categories-list', fetchAll ? 'all' : 'active'],
        { tags: ['categories'] }
    );
    return fn();
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';
    
    const categories = await getCategoriesCached(includeAll);
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("POST /api/categories body:", JSON.stringify(body));
    
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'اسم القسم مطلوب' }, { status: 400 });
    }
    
    if (!body.icon || body.icon.trim() === '') {
      return NextResponse.json({ error: 'أيقونة القسم مطلوبة' }, { status: 400 });
    }
    
    let category;
    if (body.id) {
        const id = parseInt(body.id);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        category = await prisma.category.update({
            where: { id: id },
            data: {
                name: body.name,
                icon: body.icon,
                active: body.active !== undefined ? body.active : true
            }
        });
    } else {
        // Check for duplicate name
        const existing = await prisma.category.findFirst({ where: { name: body.name } });
        if (existing) {
             return NextResponse.json({ error: 'يوجد قسم بهذا الاسم بالفعل' }, { status: 400 });
        }

        category = await prisma.category.create({
            data: {
                name: body.name,
                icon: body.icon,
                order: parseInt(body.order) || 0,
                active: body.active !== undefined ? body.active : true
            }
        });
    }
    
    revalidateTag('categories');
    return NextResponse.json(category);
  } catch (error) {
    console.error("Category Save Error:", error);
    return NextResponse.json({ 
      error: 'فشل في حفظ القسم'
    }, { status: 500 });
  }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const numericId = parseInt(id);
        if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        await prisma.category.delete({
            where: { id: numericId }
        });
        revalidateTag('categories');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Category Delete Error:", error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
