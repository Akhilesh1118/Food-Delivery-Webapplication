import React, { useContext } from 'react'
import './FoodDisplay.css'
import { StoreContext } from '../../context/StoreContext';
import FoodItem from '../FoodItem/FoodItem';

const FoodDisplay = ({ category, search = "" }) => {
    const { food_list } = useContext(StoreContext);

    return (
        <div className="food-display" id='food-display'>
            <h2>Top dishes near you</h2>
            <div className="food-display-list">
                {food_list.map((item, index) => {
                    const matchesCategory = category === "All" || category === item.category;
                    const matchesSearch = !search || 
                        item.name.toLowerCase().includes(search.toLowerCase()) || 
                        (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
                    if (matchesCategory && matchesSearch) {
                        return (
                            <FoodItem
                                key={item._id || index}
                                id={item._id}
                                name={item.name}
                                price={item.price}
                                description={item.description}
                                image={item.image}
                                isAvailable={item.isAvailable !== false}
                            />
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
};

export default FoodDisplay;
