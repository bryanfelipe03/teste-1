function initializeSupabase() {
    if (!window.supabase) {
        console.error('Supabase library not loaded');
        return null;
    }
    return window.supabase.createClient(
        'https://klngnfplterelcbeagpq.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsbmduZnBsdGVyZWxjYmVhZ3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwODI3MjcsImV4cCI6MjA2MjY1ODcyN30.QlZFVSZtH3wGipvbu591us9mF06anCLfmj4p9O7sWMM'
    );
}

document.addEventListener('DOMContentLoaded', () => {
    const supabase = initializeSupabase();
    if (!supabase) {
        document.getElementById('productsContainer').innerHTML = '<p class="text-center text-red-600">Erro ao conectar com o servidor. Tente novamente mais tarde.</p>';
        return;
    }

    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    const cartBtn = document.getElementById('cartBtn');
    const cartModal = document.getElementById('cartModal');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const subtotal = document.getElementById('subtotal');
    const shipping = document.getElementById('shipping');
    const total = document.getElementById('total');
    const checkoutForm = document.getElementById('checkoutForm');
    const orderConfirmation = document.getElementById('orderConfirmation');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const closeConfirmationBtn = document.getElementById('closeConfirmationBtn');
    const adminBtn = document.getElementById('adminBtn');
    const adminPanel = document.getElementById('adminPanel');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const closeAdminLoginBtn = document.getElementById('closeAdminLoginBtn');
    const adminContent = document.getElementById('adminContent');
    const adminPrompt = document.getElementById('adminPrompt');
    const adminError = document.getElementById('adminError');
    const productsContainer = document.getElementById('productsContainer');
    const addProductForm = document.getElementById('addProductForm');
    const removeProductForm = document.getElementById('removeProductForm');
    const removeProductSelect = document.getElementById('removeProductSelect');
    const categoryLinks = document.querySelectorAll('.category-link');

    let isAdminAuthenticated = false;

    async function loadProducts() {
        const { data, error } = await supabase.from('products').select('*');
        if (error) {
            console.error('Error loading products:', error);
            productsContainer.innerHTML = '<p class="text-center text-red-600">Erro ao carregar produtos.</p>';
            return;
        }
        renderProducts(data);
        populateRemoveProductSelect(data);
    }

    function renderProducts(products) {
        productsContainer.innerHTML = '';
        products.forEach(product => {
            const productCard = `
                <div class="product-card bg-white rounded-lg overflow-hidden shadow-md" data-category="${product.category}">
                    <img src="${product.image_url}" alt="${product.name}" class="w-full h-64 object-cover">
                    <div class="p-4">
                        <h3 class="font-bold text-lg mb-2">${product.name}</h3>
                        <p class="text-gray-600 mb-3">${product.description || 'Sem descrição'}</p>
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-purple-900">R$ ${product.price.toFixed(2)}</span>
                            <button class="add-to-cart bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700" data-product-id="${product.id}" data-product="${product.name}" data-price="${product.price}">
                                <i class="fas fa-cart-plus"></i> Comprar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            productsContainer.insertAdjacentHTML('beforeend', productCard);
        });

        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-product-id');
                const product = button.getAttribute('data-product');
                const price = parseFloat(button.getAttribute('data-price'));
                addToCart(productId, product, price);
            });
        });

        const activeCategory = document.querySelector('.category-link.font-bold')?.getAttribute('data-category') || 'all';
        filterProducts(activeCategory);
    }

    function populateRemoveProductSelect(products) {
        removeProductSelect.innerHTML = '<option value="" disabled selected>Selecione um produto</option>';
        products.forEach(product => {
            const option = `<option value="${product.id}">${product.name}</option>`;
            removeProductSelect.insertAdjacentHTML('beforeend', option);
        });
    }

    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.getAttribute('data-category');
            categoryLinks.forEach(l => l.classList.remove('font-bold', 'border-b-2', 'border-white'));
            link.classList.add('font-bold', 'border-b-2', 'border-white');
            filterProducts(category);
        });
    });

    function filterProducts(category) {
        const products = document.querySelectorAll('.product-card');
        products.forEach(product => {
            if (category === 'all' || product.getAttribute('data-category') === category) {
                product.style.display = 'block';
            } else {
                product.style.display = 'none';
            }
        });
    }

    adminBtn.addEventListener('click', () => {
        if (isAdminAuthenticated) {
            adminPanel.classList.toggle('hidden');
        } else {
            adminLoginModal.classList.remove('hidden');
        }
    });

    closeAdminLoginBtn.addEventListener('click', () => {
        adminLoginModal.classList.add('hidden');
        adminError.classList.add('hidden');
    });

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) {
                adminError.textContent = 'Email ou senha inválidos. Verifique suas credenciais.';
                adminError.classList.remove('hidden');
                console.error('Auth error:', authError);
                return;
            }

            console.log('Authenticated user ID:', authData.user.id); // Debug user ID
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', authData.user.id)
                .single();
            if (userError) {
                if (userError.code === 'PGRST116') {
                    adminError.textContent = 'Usuário não encontrado na base de administradores. Contate o suporte.';
                } else {
                    adminError.textContent = 'Erro ao verificar permissões: ' + userError.message;
                }
                adminError.classList.remove('hidden');
                console.error('User error:', JSON.stringify(userError, null, 2));
                await supabase.auth.signOut();
                return;
            }
            if (userData.role !== 'admin') {
                adminError.textContent = 'Acesso negado: você não é administrador.';
                adminError.classList.remove('hidden');
                await supabase.auth.signOut();
                return;
            }

            isAdminAuthenticated = true;
            adminLoginModal.classList.add('hidden');
            adminContent.classList.remove('hidden');
            adminPrompt.classList.add('hidden');
            adminPanel.classList.remove('hidden');
        } catch (error) {
            adminError.textContent = 'Erro inesperado durante o login. Tente novamente.';
            adminError.classList.remove('hidden');
            console.error('Unexpected error:', error);
        }
    });

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isAdminAuthenticated) {
            alert('Você precisa estar logado como admin.');
            return;
        }

        const productName = document.getElementById('productName').value;
        const productDescription = document.getElementById('productDescription').value || null;
        const productPrice = parseFloat(document.getElementById('productPrice').value);
        const productCategory = document.getElementById('productCategory').value;
        const productImage = document.getElementById('productImage').files[0];

        try {
            const fileName = `${Date.now()}_${productImage.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, productImage);

            if (uploadError) {
                console.error('Error uploading image:', uploadError);
                alert('Erro ao fazer upload da imagem: ' + uploadError.message);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            if (!publicUrlData.publicUrl) {
                console.error('Error getting public URL');
                alert('Erro ao obter a URL da imagem.');
                return;
            }

            const product = {
                name: productName,
                description: productDescription,
                price: productPrice,
                category: productCategory,
                image_url: publicUrlData.publicUrl
            };

            const { error: insertError } = await supabase.from('products').insert([product]);
            if (insertError) {
                console.error('Error adding product:', insertError);
                alert('Erro ao adicionar produto: ' + insertError.message);
                return;
            }

            alert('Produto adicionado com sucesso!');
            addProductForm.reset();
            loadProducts();
        } catch (error) {
            console.error('Unexpected error:', error);
            alert('Erro inesperado ao adicionar produto: ' + error.message);
        }
    });

    removeProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isAdminAuthenticated) {
            alert('Você precisa estar logado como admin.');
            return;
        }

        const productId = removeProductSelect.value;
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
            console.error('Error removing product:', error);
            alert('Erro ao remover produto: ' + error.message);
            return;
        }

        alert('Produto removido com sucesso!');
        removeProductForm.reset();
        loadProducts();
    });

    document.addEventListener('click', (e) => {
        if (!adminBtn.contains(e.target) && !adminPanel.contains(e.target) && !adminLoginModal.contains(e.target)) {
            adminPanel.classList.add('hidden');
        }
        if (!cartBtn.contains(e.target) && !cartModal.contains(e.target) && !cartModal.classList.contains('hidden')) {
            cartModal.classList.add('hidden');
        }
        if (!orderConfirmation.contains(e.target) && !orderConfirmation.classList.contains('hidden') && !e.target.closest('#closeConfirmationBtn')) {
            orderConfirmation.classList.add('hidden');
        }
    });

    cartBtn.addEventListener('click', () => {
        cartModal.classList.remove('hidden');
        updateCartDisplay();
    });

    closeCartBtn.addEventListener('click', () => {
        cartModal.classList.add('hidden');
    });

    closeConfirmationBtn.addEventListener('click', () => {
        orderConfirmation.classList.add('hidden');
    });

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('customerName').value;
        const address = document.getElementById('deliveryAddress').value;
        const payment = document.querySelector('input[name="payment"]:checked').value;
        const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const cartTotal = cartSubtotal + 15;

        const order = {
            customer_name: name,
            delivery_address: address,
            payment_method: payment,
            subtotal: cartSubtotal,
            shipping: 15.00,
            total: cartTotal,
            created_at: new Date().toISOString()
        };

        const { data: orderData, error: orderError } = await supabase.from('orders').insert([order]).select().single();
        if (orderError) {
            console.error('Error saving order:', orderError, 'Order data:', order);
            alert('Erro ao salvar o pedido. Por favor, tente novamente mais tarde.');
            return;
        }

        const orderItems = cart.map(item => ({
            order_id: orderData.id,
            product_id: item.productId,
            product_name: item.product,
            quantity: item.quantity,
            price: item.price
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) {
            console.error('Error saving order items:', itemsError);
            alert('Erro ao salvar os itens do pedido. Por favor, tente novamente mais tarde.');
            return;
        }

        let message = `Olá Moda Elegante! 😊\n\n`;
        message += `Acabei de finalizar minha compra:\n\n`;
        message += `👤 Nome: ${name}\n`;
        message += `🏠 Endereço: ${address}\n`;
        message += `💳 Forma de Pagamento: ${payment}\n\n`;
        message += `📦 Itens:\n`;
        cart.forEach(item => {
            message += `- ${item.product} (${item.quantity}x) - R$ ${item.price.toFixed(2)}\n`;
        });
        message += `\n🚚 Frete: R$ 15,00\n`;
        message += `💰 Total: R$ ${cartTotal.toFixed(2)}\n\n`;
        message += `Aguardando ansiosamente minha encomenda! ❤️`;

        confirmationMessage.textContent = 'Seu pedido foi confirmado! Enviamos os detalhes para o WhatsApp da loja. Obrigado por comprar conosco!';
        cartModal.classList.add('hidden');
        orderConfirmation.classList.remove('hidden');

        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        updateCartDisplay();

        const whatsappUrl = `https://wa.me/5518997894841?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    });

    function addToCart(productId, product, price) {
        const existingItem = cart.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ productId, product, price, quantity: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        if (cartModal.classList.contains('hidden')) {
            cartModal.classList.remove('hidden');
            updateCartDisplay();
        }
    }

    function updateCartCount() {
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = count;
    }

    function updateCartDisplay() {
        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="text-center text-gray-500 py-8">Seu carrinho está vazio</p>';
            subtotal.textContent = 'R$ 0,00';
            total.textContent = 'R$ 15,00';
            shipping.textContent = 'R$ 15,00';
            return;
        }

        let html = '';
        let cartSubtotal = 0;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            cartSubtotal += itemTotal;
            html += `
                <div class="flex justify-between items-center mb-4 pb-4 border-b">
                    <div>
                        <h4 class="font-bold">${item.product}</h4>
                        <p class="text-gray-500">${item.quantity}x R$ ${item.price.toFixed(2)}</p>
                    </div>
                    <div class="flex items-center">
                        <span class="font-bold mr-4">R$ ${itemTotal.toFixed(2)}</span>
                        <button class="remove-item text-red-600 hover:text-red-800" data-product-id="${item.productId}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        cartItems.innerHTML = html;
        subtotal.textContent = `R$ ${cartSubtotal.toFixed(2)}`;
        shipping.textContent = `R$ 15,00`;
        total.textContent = `R$ ${(cartSubtotal + 15).toFixed(2)}`;

        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-product-id');
                cart = cart.filter(item => item.productId !== productId);
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartCount();
                updateCartDisplay();
            });
        });
    }

    loadProducts();
    updateCartCount();
    updateCartDisplay();
});
