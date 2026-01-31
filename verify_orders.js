const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    console.log("--- ORDER VERIFICATION START ---");
    
    // 1. Fetch Orders directly from DB
    const dbOrders = await prisma.order.findMany();
    console.log(`DB Count: ${dbOrders.length}`);
    
    dbOrders.forEach(o => {
        console.log(`[DB] Order #${o.id} | Status: ${o.status} | Created: ${o.createdAt}`);
    });

    if (dbOrders.length === 0) {
        console.warn("No orders in DB. Creating a TEST order...");
        await prisma.order.create({
            data: {
                customerName: "Test Auto",
                customerPhone: "0555000000",
                status: "pending", // Intentionally using 'pending' to test mapping
                total: 1000,
                orderType: "delivery",
                items: {
                    create: [{ mealId: 1, mealName: "Test Meal", quantity: 1, price: 1000 }]
                }
            }
        });
        console.log("Test order created.");
    }

    console.log("--- ORDER VERIFICATION END ---");

  } catch (error) {
    console.error("VERIFICATION ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
