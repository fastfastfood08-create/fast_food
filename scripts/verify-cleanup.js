const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Try to load .env manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  console.log('Loading .env from', envPath);
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    if (line.startsWith('#') || !line.trim()) return;
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      // Basic handling of quotes
      let val = valueParts.join('=').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key.trim()] = val;
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  console.log("\n--- Starting Verification ---");

  // 1. Create dummy data
  // Using random phone to avoid unique constraints if any (schema allows duplicate phones)
  const rand = Math.floor(Math.random() * 10000);
  
  console.log("Creating 3 test orders...");
  
  // Order to KEEP (New)
  const orderNew = await prisma.order.create({ 
    data: { 
      customerName: 'VERIFY_KEEP_NEW', 
      customerPhone: `000${rand}`, 
      total: 100, 
      status: 'new',
      items: {
          create: [{ mealId: 1, mealName: 'Test Meal', quantity: 1, price: 100 }]
      }
    } 
  });

  // Order to DELETE (Delivered)
  const orderDelivered = await prisma.order.create({ 
    data: { 
      customerName: 'VERIFY_DELETE_DELIVERED', 
      customerPhone: `000${rand}`, 
      total: 100, 
      status: 'delivered',
      items: {
          create: [{ mealId: 1, mealName: 'Test Meal', quantity: 1, price: 100 }]
      }
    } 
  });

  // Order to DELETE (Cancelled)
  const orderCancelled = await prisma.order.create({ 
    data: { 
      customerName: 'VERIFY_DELETE_CANCELLED', 
      customerPhone: `000${rand}`, 
      total: 100, 
      status: 'cancelled',
      items: {
          create: [{ mealId: 1, mealName: 'Test Meal', quantity: 1, price: 100 }]
      }
    } 
  });

  console.log(`Created orders: 
  - ID ${orderNew.id} (new) -> SHOULD KEEP
  - ID ${orderDelivered.id} (delivered) -> SHOULD DELETE
  - ID ${orderCancelled.id} (cancelled) -> SHOULD DELETE`);

  // 2. Run cleanup logic (Mimicking the route logic exactly)
  console.log("\nRunning cleanup logic...");
  
  const deletedOrders = await prisma.order.deleteMany({
      where: {
        status: {
          in: ['delivered', 'cancelled']
        }
      }
    });

  console.log(`Cleanup finished. Deleted count: ${deletedOrders.count}`);

  // 3. Verify Results
  console.log("\nVerifying results...");
  
  const checkNew = await prisma.order.findUnique({ where: { id: orderNew.id } });
  const checkDelivered = await prisma.order.findUnique({ where: { id: orderDelivered.id } });
  const checkCancelled = await prisma.order.findUnique({ where: { id: orderCancelled.id } });

  let success = true;

  if (checkNew) {
    console.log(`✅ Success: 'new' order (${orderNew.id}) was PRESERVED.`);
  } else {
    console.error(`❌ Failure: 'new' order (${orderNew.id}) was DELETED.`);
    success = false;
  }

  if (!checkDelivered) {
    console.log(`✅ Success: 'delivered' order (${orderDelivered.id}) was DELETED.`);
  } else {
    console.error(`❌ Failure: 'delivered' order (${orderDelivered.id}) STILL EXISTS.`);
    success = false;
  }

  if (!checkCancelled) {
    console.log(`✅ Success: 'cancelled' order (${orderCancelled.id}) was DELETED.`);
  } else {
    console.error(`❌ Failure: 'cancelled' order (${orderCancelled.id}) STILL EXISTS.`);
    success = false;
  }

  // 4. Verify cascade delete (items)
  if (!checkDelivered) {
      const itemsCount = await prisma.orderItem.count({ where: { orderId: orderDelivered.id } });
      if (itemsCount === 0) {
          console.log("✅ Success: Cascade delete worked (items removed).");
      } else {
          console.error(`❌ Failure: Order items for deleted order still exist (${itemsCount}).`);
          success = false;
      }
  }

  console.log("\n--- Final Result ---");
  if (success) {
      console.log("VERIFICATION PASSED");
      // Cleanup the one we kept
      await prisma.order.delete({ where: { id: orderNew.id } });
      console.log("(Cleaned up test data)");
  } else {
      console.error("VERIFICATION FAILED");
  }
}

main()
  .catch(e => {
    console.error("Error running verification:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
