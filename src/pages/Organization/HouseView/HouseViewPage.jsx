import { useParams } from "react-router-dom";
import CustomerHouseView from "./CustomerHouseView";

const HouseViewPage = () => {
  const { id } = useParams();

  // You can fetch images by customer id here and pass them as props
  // const [images, setImages] = useState([]);
  // useEffect(() => { fetch images for customerId: id }, [id]);

  return (
    <div className="page-content">
      <div className="container-fluid">
        <CustomerHouseView
          title="Customer House View"
          // images={images}  ← pass fetched images here
        />
      </div>
    </div>
  );
};

export default HouseViewPage;