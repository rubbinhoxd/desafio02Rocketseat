import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
     const storagedCart = localStorage.getItem('@RocketShoes:cart'); //busca os dados do api

     if (storagedCart) { //verifica se tem algo com valor
       return JSON.parse(storagedCart); //forçou, pq n é string e sim um array de produtos
     }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart]; //novo array com os valores de cart, que eu ja tinha
      const produtoExiste = newCart.find(product => product.id === productId); //criando variavel que saberá se o id daquele determinado produto foi achado no array

      //api.get chama a rota
      const estoque = await api.get(`/stock/${productId}`); //fazendo a verificação do estoque
      
      const estoqueAtual = produtoExiste ? produtoExiste.amount : 0; //se produto está presente no carrinho, então, retorne o valor, caso n, retorne 0. Devemos fazer isso, para não adicionar item repetido, apenas incrementar
      
      const quantidade = estoqueAtual + 1; //incrementando algum item repetido

      //verificando se a quantidade selecionada tem no estoque, vulgo api
      if(quantidade > estoque.data.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(produtoExiste){
        produtoExiste.amount = quantidade; //atualiza a quantidade
      }
      else{
        const product = await api.get(`/products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1
        }
        newCart.push(newProduct); //por fim atualiza o produto adicionado no novo array
      }
      setCart(newCart); //mudar estado no react precisamos usar setcart
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));//SALVANDO NA API, POREM COMO ELA ACEITA APENAS STRING, PRECISAMOS TRANSFORMAR O ARRAY NEWCART EM STRING COM A FUNCTION STRINGIFY. 

    } catch {
      toast.error('Erro na adição do produto');

    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart]; //desestruturação
      const productIndex = newCart.findIndex(product => product.id === productId);

      if(productIndex >= 0){
         newCart.splice(productIndex, 1); //splice remove e passa como parametro de onde vai começar a remoção e qnt eu quero remover
         setCart(newCart); //salva estado 
         localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart)); //salva na api
      }else{
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount, //qtd final 
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

    const stock =  await api.get(`/stock/${productId}`); //variavel criada para conferir no /stock da api

    if(amount > stock.data.amount){
      toast.error('Quantidade solicitada fora de estoque');
      return;
    }

    const newCart = [...cart];  //preservando

    const productExist = newCart.find(product => product.id === productId);

    if(!productExist){
      toast.error('Erro na alteração de quantidade do produto');
    }else{
      productExist.amount = amount;
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart)); //salvando na api o novo vetor de carrinho com novas atualizações.
    }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
